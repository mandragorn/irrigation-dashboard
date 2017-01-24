/**
 * Client code related to the dashboard.
 * @module App.Dashboard
 */
var TorsoView = require('torso/modules/View');
var dashboardTemplate = require('./dashboard-template.hbs');
var moistureChartView = require('../moisture/moistureChartView');
var moistureControlView = require('../moisture/moistureControlView');
/**
 * View that renders the irrigation app dashboard.
 * @class dashboardView
 * @static
 * @author jyoung
 */
module.exports = new (TorsoView.extend({
  tagName: 'main',
  template: dashboardTemplate,

  initialize: function() {
    this.set({
      showChart: true,
      showControl: false
    });
    moistureControlView.deactivate();
    moistureChartView.activate();

    this.listenTo(this.viewState, 'change:showChart change:showControl', this.render);
  },

  attachTrackedViews: function() {
    if (this.get('showChart')) {
      this.attachView('moisture-chart', moistureChartView, { shared: true });
    }
    if (this.get('showControl')) {
      this.attachView('irrigation-control', moistureControlView, { shared: true });
    }
  },

  showChart: function() {
    moistureChartView.activate();
    this.set('showChart', true);
    this.set('showControl', false);
    moistureControlView.deactivate();
  },

  showControl: function() {
    moistureControlView.activate();
    this.set('showChart', false);
    this.set('showControl', true);
    moistureChartView.deactivate();
  }
}))();
