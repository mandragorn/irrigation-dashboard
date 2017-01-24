var Torso = require('torso');
var $ = require('jquery');
var dashboardPerspective = require('./dashboard/dashboardView');

/**
 * Router for the entire Irrigation application.
 *
 * @class router
 * @static
 * @author jyoung
 */
module.exports = new (Torso.Router.extend({
  /**
   * The current perspective being rendered.
   * @property _current {Torso.View}
   */
  _current: null,

  /**
   * Key-value pairs of hashes to methods on the router.  When the given hash is used then the associated method is run.
   * @property routes {Object}
   */
  routes: {
    '': '_dashboard',
    'chart': '_chart',
    'control': '_control'
  },

  /**
   * Stop the history if it's already started. Bind the routes, and start.
   * and start the history.
   * @method start
   */
  start: function() {
    Torso.history.stop();
    this._bindRoutes();
    Torso.history.start();
  },

  /**
   * Initialize the medicine widgets and page layout
   * @method _dashboard
   * @private
   */
  _dashboard: function() {
    this._switchPerspective(dashboardPerspective);
  },

  _chart: function() {
    dashboardPerspective.showChart();
    this._switchPerspective(dashboardPerspective);  
  },

  _control: function() {
    dashboardPerspective.showControl();
    this._switchPerspective(dashboardPerspective);
  },

  /**
   * Switches the current perspective to be the given perspective.
   * @method _switchPerspective
   * @param nextPerspective {Torso.View} the perspective to render.
   */
  _switchPerspective: function(nextPerspective) {
    if (this._current) {
      this._current.detach();
    }

    this._current = nextPerspective;
    this._current.attachTo($('.app'));
  }
}))();
