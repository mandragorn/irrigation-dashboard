/**
 * Client code related to the dashboard.
 * @module App.Dashboard
 */
var TorsoView = require('torso/modules/View');
var dashboardTemplate = require('./dashboard-template.hbs');
var moistureListView = require('../moisture/moistureListView');
var moistureChartView = require('../moisture/moistureChartView');

/**
 * View that renders the irrigation app dashboard.
 * @class dashboardView
 * @static
 * @author jyoung
 */
module.exports = new (TorsoView.extend({
  template: dashboardTemplate,

  initialize: function() {
    this.listenTo(moistureChartView, 'change:page', this._setPage);
  },
  attachTrackedViews: function() {
    this.attachView('moisture-list', moistureListView);
    this.attachView('moisture-chart', moistureChartView);
  },
  _setPage: function(moistureChartViewState, newPage) {
    moistureListView.setPage(newPage);
  },
  _updateChart: function() {
    moistureChartView.update();
  }
}))();
