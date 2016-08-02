var _ = require('lodash');
var TorsoView = require('torso/modules/View');
var BaseDataService = require('../data-utils/BaseDataService');
var moistureChartTemplate = require('./moisture-chart-template.hbs');
var GoogleChartBehavior = require('torso-google-chart');

module.exports = new (TorsoView.extend(BaseDataService.mixin({
  template: moistureChartTemplate,

  events: {
    'click [data-update]': 'update'
  },

  behaviors: {
    moistureChart: {
      behavior: GoogleChartBehavior,
      _chartContainerSelector: '[data-moisture-chart-container]',
      /**
       * Options for the LineChart draw method.
       */
      chartOptions: {
        title: 'Moisture over time',
        width: 900,
        height: 500,
        hAxis: {
          format: 'MMM d: h:mm aa'
        }
      },
      _initializeChartDataSource: function(moistureDataTable) {
        moistureDataTable.addColumn('datetime', 'Date of Measurement');
        moistureDataTable.addColumn('number', 'Moisture');
      },
      _getChartDataSourceRows: function() {
        var moistureCollection = this.view.getPrivateCollection('moisture');
        var moistureCollectionData = moistureCollection.toJSON();
        var moistureChartData = _.map(moistureCollectionData, function(data) {
          return [new Date(data.created_at), data.value];
        });
        return moistureChartData;
      }
    }
  },

  dataModels: [{
    alias: 'moisture',
    collectionType: 'moisture',
    dependencies: ['view:page', 'view:pageSize'],
    criteria: function() {
      return {
        pagination: {
          page: this.get('page'),
          pageSize: this.get('pageSize')
        }
      };
    }
  }],

  initialize: function() {
    this.set('page', 1);
    this.set('pageSize', 4);
    this.on('fetched:moisture', function() {
      this.getBehavior('moistureChart').trigger('dataUpdated');
    });
  },

  update: function() {
    var currentPage = this.get('pageSize');
    var nextPage = currentPage + 1;
    if (nextPage > 10) {
      nextPage = 2;
    }
    this.set('pageSize', nextPage);
//    this.forceFetch('moisture');
  }
})))();