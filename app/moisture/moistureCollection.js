var _ = require('lodash');
var $ = require('jquery');
var TorsoCollection = require('torso/modules/Collection');
var TorsoModel = require('torso/modules/Model');


/**
 * Cache collection of moisture measurements.
 * @class moistureCollection
 * @static
 * @author jyoung
 */
module.exports = new (TorsoCollection.extend({
  model: TorsoModel,
  url: '/moisture',
  fetchHttpAction: 'POST',
  fullListSize: 0,
  setFullListSize: function(fullListSize) {
    this._fullListSize = fullListSize;
  },
  getFullListSize: function() {
    return this._fullListSize;
  },
  fetchIdsByCriteria: function(criteria, options) {
    var callingCollection = options.privateCollection;
    console.log(_.result(this, 'url') + '/criteria');
    return $.ajax({
      url: _.result(this, 'url') + '/criteria',
      contentType: 'application/json',
      type: 'POST',
      dataType: 'json',
      data: JSON.stringify(criteria)
    })
      .then(function(response) {
        callingCollection.setFullListSize(response.pagination.rowCount);
        return response.ids;
      });
  }
}))();
