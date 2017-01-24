var $ = require('jquery');
var Handlebars = require('handlebars');
var handlebarsHelpersSetup = require('./handlebars-helpers');
var MomentHandler = require('handlebars.moment');

// Expose some globals
window.$ = $;
window.jQuery = $;

handlebarsHelpersSetup(Handlebars);
MomentHandler.registerHelpers(Handlebars);

/**
 * Client side code.
 * @module App
 */
$(window).ready(function () {
  /**
   * Start the application router.
   * @class main
   * @static
   * @author jyoung
   */
  require('./router').start();
});

