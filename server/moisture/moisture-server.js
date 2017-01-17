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
var bodyParser = require('body-parser');
var MoistureModel = require('./MoistureModel');

var PORT = 8090;
var DEFAULT_SORT_DIRECTION = 'asc';
var DEFAULT_SORT = [{
  column: 'created_at',
  direction: DEFAULT_SORT_DIRECTION
}];
var DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 10
};

function allowCrossDomain(request, response, next) {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  var fullRequestUrl = request.method + ': ' + request.protocol + '://' + request.get('host') + request.originalUrl;
  console.log('Request!', fullRequestUrl);
  next();
}

server.use(allowCrossDomain);
server.use(bodyParser.json());
server.use(require('express-promise')());

server.get('/', function(request, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end('I\'m ALIVE!');
});

/**
 * POST with the criteria object that supports the following properties:
 *
 * @method POST_/criteria
 * @param criteria {Object} [POST body] the criteria object to use to filter the ids from the server.
 *   @param [criteria.pagination] {Object} paging information for the ids list.
 *     @param [criteria.pagination.pageSize=10] {Number} the number of ids per page to return.
 *     @param [criteria.pagination.page=1] {Number} the page number (1-based) of ids to return.
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
  var sorting = fetchCriteria.sorting || DEFAULT_SORT;

  try {
    var moistureIdsByCriteriaQuery = MoistureModel.query(function(queryBuilder) {
      queryBuilder.select('id');
      if (_.isString(sorting)) {
        queryBuilder.orderBy(sorting);
      } else if (_.isArray(sorting)) {
        _.each(sorting, function(singleSort) {
          if (!singleSort.column) {
            throw 'column property is required for a sort definition ' + JSON.stringify(singleSort);
          }
          singleSort.direction = singleSort.direction || DEFAULT_SORT_DIRECTION;
          queryBuilder.orderBy(singleSort.column, singleSort.direction);
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
