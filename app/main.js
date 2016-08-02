var $ = require('jquery');
var Handlebars = require('handlebars');
var handlebarsHelpersSetup = require('./handlebars-helpers');

// Expose some globals
window.$ = $;
window.jQuery = $;

handlebarsHelpersSetup(Handlebars);

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

