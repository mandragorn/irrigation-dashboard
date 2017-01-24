var _ = require('lodash');
var TorsoView = require('torso/modules/View');
var moistureControlTemplate = require('./moisture-control-template.hbs');
var moistureControlModel = require('./moistureControlModel');

module.exports = new (TorsoView.extend({
  className: 'control',
  template: moistureControlTemplate,

  model: moistureControlModel,

  initialize: function() {
    _.bindAll(this, 'fetchMoistureControlData');
    moistureControlModel.fetch();
  },

  _activate: function() {
    this._refreshInterval = window.setInterval(this.fetchMoistureControlData, 30000);
    this.listenTo(moistureControlModel, 'change', this.render);
    this.listenTo(this.viewState, 'change:fetchInProgress', this.render);
  },

  _deactivate: function() {
    window.clearInterval(this._refreshInterval);
    delete this._refreshInterval;
    this.stopListening(moistureControlModel);
  },

  fetchMoistureControlData: function() {
    var moistureControlView = this;
    this.set('fetchInProgress', true);
    moistureControlModel.fetch()
      .then(function() {
        moistureControlView.set('fetchInProgress', false);
      }, function() {
        moistureControlView.set('fetchInProgress', false);
      });
  }
}))();
