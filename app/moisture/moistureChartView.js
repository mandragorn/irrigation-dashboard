var _ = require('lodash');
var $ = require('jquery');
var TorsoView = require('torso/modules/View');
var moistureChartTemplate = require('./moisture-chart-template.hbs');
var GoogleChartBehavior = require('torso-google-chart/GoogleChartBehavior');

var PAGE_SIZE = 100;
var MAX_MOISTURE_VALUE = 1024;

module.exports = new (TorsoView.extend({
  className: 'chart',
  template: moistureChartTemplate,

  behaviors: {
    moistureChart: {
      behavior: GoogleChartBehavior,
      _chartContainerSelector: '[data-moisture-chart-container]',
      /**
       * Options for the LineChart draw method.
       */
      _chartOptions: {
        title: 'Dryness over time',
        hAxis: {
          format: 'MMM d h:mm aa'
        },
        vAxis: {
          title: 'Dryness %',
          format: 'percent',
          viewWindow: {
            max: 1
          }
        },
        curveType: 'function',
        lineWidth: 0.5,
        intervals: { style: 'line' },
        legend: 'none'
      },
      _initializeChartDataSource: function(moistureDataTable) {
        moistureDataTable.addColumn('datetime', 'Date of Measurement');
        moistureDataTable.addColumn('number', 'Moisture');
        moistureDataTable.addColumn({ id: 'max_std_dev', type: 'number', role: 'interval' });
        moistureDataTable.addColumn({ id: 'min_std_dev', type: 'number', role: 'interval' });
      },
      _getChartDataSourceRows: function() {
        var moistureCollectionData = this.view.get('moistureData');
        var moistureChartData = _.map(moistureCollectionData, function(data) {
          var avg = Number.parseFloat(data.avg_moisture);
          avg = avg / MAX_MOISTURE_VALUE;
          var std_dev = Number.parseFloat(data.std_dev_moisture);
          std_dev = std_dev / MAX_MOISTURE_VALUE;
          //std_dev = 100;
          var std_dev_max = avg + std_dev;
          var std_dev_min = avg - std_dev;
          return [new Date(data.created_at), avg, std_dev_max, std_dev_min];
        });
        return moistureChartData;
      }
    }
  },

  initialize: function() {
    _.bindAll(this, 'fetchSampledMoisture');
    this.set({
      fetchInProgress: true,
      startTime: new Date(2017, 0, 15, 10).getTime(),
      endTime: Date.now(), 
      sampling: {
        count: PAGE_SIZE
      },
      page: 1,
      pageSize: PAGE_SIZE
    });
    this.listenTo(this.viewState, 'change:moistureData', function() {
      this.getBehavior('moistureChart').trigger('dataUpdated');
    });
    this.listenTo(this.viewState, 'change:startTime change:endTime change:sampling', this.fetchSampledMoisture);
    this.listenTo(this.viewState, 'change:page change:moistureData change:fetchInProgress', this.render);
    this.fetchSampledMoisture();
  },

  _activate: function() {
    this._refreshInterval = window.setInterval(this.fetchSampledMoisture, 30000);
  },

  _deactivate: function() {
    window.clearInterval(this._refreshInterval);
    delete this._refreshInterval;
  },

  fetchSampledMoisture: function() {
    var view = this;
    view.set('fetchInProgress', true);
    return $.post({
      url: '/moisture/sample',
      data: JSON.stringify({
        startTime: this.get('startTime'),
        endTime: this.get('endTime'),
        sampling: this.get('sampling'),
        pagination: {
          page: this.get('page'),
          pageSize: this.get('pageSize')
        }
      }),
      contentType: 'application/json',
      dataType: 'json'
    }).then(function(moistureData) {
      view.set('fetchInProgress', false);
      view.set('moistureData', moistureData);
    }, function() {
      view.set('fetchInProgress', false);
    });
  }
}))();
