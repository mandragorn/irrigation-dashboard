#!/usr/bin/env nodejs
/**
 * Moisture RESTful server.
 *
 * @class server
 * @static
 * @author jyoung
 */
var _ = require('lodash');
var server = require('express')();
var http = require('http');
var bodyParser = require('body-parser');
var MoistureModel = require('./MoistureModel');
var knex = require('knex');

var PORT = 8090;
var DEFAULT_SORT_DIRECTION = 'asc';
var DEFAULT_SORT = [{
  column: 'created_at',
  direction: DEFAULT_SORT_DIRECTION
}];
var DEFAULT_SAMPLING = {};
var DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 10
};

function allowCrossDomain(request, response, next) {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  var fullRequestUrl = request.method + ': ' + request.protocol + '://' + request.get('host') + request.originalUrl;
  console.log('Request! ', fullRequestUrl);
  console.log('request.body: ', request.body);
  next();
}

server.use(allowCrossDomain);
server.use(bodyParser.json());
server.use(require('express-promise')());

server.get('/', function(request, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end('I\'m ALIVE!');
});

function addSortingToQuery(sorting, queryBuilder) {
  if (_.isString(sorting)) {
    queryBuilder.orderBy(sorting);
  } else if (_.isArray(sorting)) {
    _.each(sorting, function(singleSort) {
      addSortingToQuery(singleSort, queryBuilder);
    });
  } else if (_.isObject(sorting)) {
    if (!sorting.column) {
      throw 'column property is required for a sort definition ' + JSON.stringify(sorting);
    }
    sorting.direction = sorting.direction || DEFAULT_SORT_DIRECTION;
    queryBuilder.orderBy(sorting.column, sorting.direction);
  } else {
    throw 'Sorting property not recognized (must be String, object or array of objects ' + JSON.stringify(sorting);
  }
}

function restrictByStartAndEndTime(startTime, endTime, queryBuilder) {
  var startTimeDate = startTime && new Date(startTime);
  var endTimeDate = endTime && new Date(endTime);

  if (startTimeDate && endTimeDate) {
    queryBuilder.whereBetween('created_at', [startTimeDate, endTimeDate]);
  } else if (startTime) {
    queryBuilder.where('created_at', '>', startTimeDate);
  } else if (endTime) {
    queryBuilder.where('created_at', '<', endTimeDate);
  }
}

function getBinnedCreatedAt(binSizeInMs) {
  return 'TIMESTAMP WITH TIME ZONE \'epoch\' + ROUND(EXTRACT(EPOCH FROM created_at AT TIME ZONE \'EST\') * 1000 / ' + binSizeInMs + ') * ' + binSizeInMs + ' * INTERVAL \'1 millisecond\'';
}

/**
 * GET the state of the controller
 * @method GET_/control
 */
server.get('/control', function(request, response) {
  http.get({
    host: '192.168.1.16',
    path: '/state'
  }, function(controlResponse) {
    var controlData = '';

    controlResponse.on('data', function(chunk) {
      controlData += chunk;
    });

    controlResponse.on('end', function() {
      response.send(controlData);
    });
  });
});

/**
 * POST with the criteria object that supports the following properties:
 *
 * @method POST_/sample
 * @param criteria {Object} [POST body] the criteria object to use to filter the values from the server.
 *   @param [criteria.pagination] {Object} paging information for the ids list.
 *     @param [criteria.pagination.pageSize=10] {Number} the number of ids per page to return.
 *     @param [criteria.pagination.page=1] {Number} the page number (1-based) of ids to return.
 *     @param [criteria.startTime=null] {Number} ms since epoch for the first entry to retrieve.
 *     @param [criteria.endTime=null] {Number} ms since epoch for the last entry to retrieve.
 *   @param [criteria.sorting=null] {Object|String|Object[]} String means single column ascending sort. Object means single column with direction defined { column: 'columnName', direction: ['asc'|'desc']} Array is an array of objects (as defined above) for multi-sort.
 * @return {Object} with an ids property with the ids found along with pagination and sorting properties that contain info about the paging and sorting that was performed.  The pagination property also includes the rowCount and pageCount based on the total number of items that match the criteria.
 *
 *    {
 *       ids: [],
 *       pagination: {
 *         page: #,
 *         pageSize: #,
 *         rowCount: #,
 *         pageCount: #
 *       },
 *       sorting: [same as criteria.sorting above]
 *     }
 *      
 */
server.post('/sample', function(request, response) {
  var fetchCriteria = request.body;
  console.log('fetchCriteria', fetchCriteria);
  var sampling = fetchCriteria.sampling || DEFAULT_SAMPLING;
  console.log('sampling', sampling);
  var startTime = fetchCriteria.startTime;
  console.log('startTime', startTime);
  var endTime = fetchCriteria.endTime;
  console.log('endTime', endTime);

  try {
    var moistureIdsByCriteriaQuery = MoistureModel.query(function(queryBuilder) {
      var binSizeInMs = (endTime - startTime) / sampling.count;
      console.log('binSizeInMs', binSizeInMs);
      var binnedCreatedAt = getBinnedCreatedAt(binSizeInMs);
      console.log('binnedCreatedAt', binnedCreatedAt);
      queryBuilder.select(knex.raw('avg(value) as avg_moisture, stddev_pop(value) as std_dev_moisture, ' + binnedCreatedAt + ' as created_at'));
      restrictByStartAndEndTime(startTime, endTime, queryBuilder);
      queryBuilder.orderByRaw(binnedCreatedAt);
      queryBuilder.groupByRaw(binnedCreatedAt);
    });
  } catch (error) {
    response.status(500).send(error);
    throw error;
  }

  var pagination = fetchCriteria.pagination || DEFAULT_PAGINATION;
  var moistureIdsByCriteriaPromise = moistureIdsByCriteriaQuery.fetchPage({
    pageSize: pagination.pageSize,
    page: pagination.page
  });

  response.json(moistureIdsByCriteriaPromise);
});

/**
 * POST with the criteria object that supports the following properties:
 *
 * @method POST_/criteria
 * @param criteria {Object} [POST body] the criteria object to use to filter the ids from the server.
 *   @param [criteria.pagination] {Object} paging information for the ids list.
 *     @param [criteria.pagination.pageSize=10] {Number} the number of ids per page to return.
 *     @param [criteria.pagination.page=1] {Number} the page number (1-based) of ids to return.
 *     @param [criteria.startTime=null] {Number} ms since epoch for the first entry to retrieve.
 *     @param [criteria.endTime=null] {Number} ms since epoch for the last entry to retrieve.
 *   @param [criteria.sorting=null] {Object|String|Object[]} String means single column ascending sort. Object means single column with direction defined { column: 'columnName', direction: ['asc'|'desc']} Array is an array of objects (as defined above) for multi-sort.
 * @return {Object} with an ids property with the ids found along with pagination and sorting properties that contain info about the paging and sorting that was performed.  The pagination property also includes the rowCount and pageCount based on the total number of items that match the criteria.
 *
 *    {
 *       ids: [],
 *       pagination: {
 *         page: #,
 *         pageSize: #,
 *         rowCount: #,
 *         pageCount: #
 *       },
 *       sorting: [same as criteria.sorting above]
 *     }
 *      
 */
server.post('/criteria', function(request, response) {
  var fetchCriteria = request.body;
  console.log('fetchCriteria: ', fetchCriteria);
  var sorting = fetchCriteria.sorting || DEFAULT_SORT;
  var startTime = fetchCriteria.startTime;
  var endTime = fetchCriteria.endTime;

  try {
    var moistureIdsByCriteriaQuery = MoistureModel.query(function(queryBuilder) {
      queryBuilder.select('id');
      restrictByStartAndEndTime(startTime, endTime, queryBuilder);
      addSortingToQuery(sorting, queryBuilder);
    });
  } catch (error) {
    response.status(500).send(error);
    throw error;
  }

  var pagination = fetchCriteria.pagination || DEFAULT_PAGINATION;
  var moistureIdsByCriteriaPromise = moistureIdsByCriteriaQuery.fetchPage({
    pageSize: pagination.pageSize,
    page: pagination.page
  });

  var idsOnlyPromise = moistureIdsByCriteriaPromise
    .then(function(collection) {
      return {
        ids: collection.pluck('id'),
        pagination: collection.pagination,
        sorting: sorting
      };
    });
  response.json(idsOnlyPromise);
});

/**
 * POST ids array that will return the full models.
 *
 * @method POST_/ids
 * @param ids {String[]|Number[]} [POST body] the ids of the models to fetch from the server.
 * @return {MoistureModel[]} the ids matching the criteria including paging.
 */
server.post('/ids', function(request, response) {
  var idsToFetch = request.body;
  if (!idsToFetch) {
    var requiredError = 'ids to fetch is required in the POST body';
    response.status(500).send(requiredError);
    throw requiredError;
  }
  if (!_.isArray(idsToFetch)) {
    var arrayError = 'ids to fetch must be an array';
    response.status(500).send(arrayError);
    throw arrayError;
  }
  var moistureByIdsQuery = MoistureModel.query('whereIn', 'id', idsToFetch);
  var moistureByIdsPromise = moistureByIdsQuery.fetchAll();
  response.json(moistureByIdsPromise);
});

/**
 * Post new MoistureModel to save to the database.
 *
 * @method POST_/
 * @param {Object} JSON containing moisture data.
 * @return {MoistureModel[]} that was saved to the db.
 */
server.post('/', function(request, response) {
  var moistureDataFromRequest = request.body;
  console.log(moistureDataFromRequest);
  var newMoistureModel = MoistureModel.deserialize(moistureDataFromRequest);
  var savePromise = newMoistureModel.save();
  response.json(savePromise);
});

server.listen(PORT, function() {
  console.log('Server listening on: http://localhost:%s', PORT); // eslint-disable-line no-console
});
