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
  attachTrackedViews: function() {
    this.attachView('moisture-list', moistureListView);
    this.attachView('moisture-chart', moistureChartView);
  },
  _updateChart: function() {
    moistureChartView.update();
  }
}))();
