var _ = require('lodash');
var moment = require('moment');

/**
 * @param  {String} inputString
 * @return {Boolean} true if input is a String representation of a Number, false otherwise
 *                   (false if not a String)
 */
function isNumberString(inputString) {
  return typeof inputString === 'string' && !_.isEmpty(inputString) && !isNaN(inputString);
}

/**
 * All helper functions for the Handlebars.js templating engine
 * @class handlebars-helpers
 * @param Handlebars {Handlebars} the handlebars instance to attach the helpers to.
 */
module.exports = function(Handlebars) {
  /**
   * Example:
      {{formatDate date 'YYYY-MM-DD HH:mm:ss'}}

      For:
        {{formatDate '1944-04-04' 'YYYY-MM-DD HH:mm:ss'}}
          result is '1944-04-04 00:00:00'

        {{formatDate -812404800000 'YYYY-MM-DD HH:mm:ss'}}
          result is '1944-04-04 00:00:00'

        {{formatDate '-812404800000' 'YYYY-MM-DD HH:mm:ss'}}
          result is '1944-04-04 00:00:00'

        {{formatDate null 'YYYY-MM-DD HH:mm:ss'}} or {{formatDate NaN 'YYYY-MM-DD HH:mm:ss'}}
          result is 'Invalid date'

        {{formatDate 'bad stuff 1991' 'YYYY-MM-DD HH:mm:ss'}}
          result is '1991-01-01 00:00:00'

   * Date formatting function to format a date using moment.js (http://momentjs.com/)
   * @param  {String} inputString Anything moment can parse
   * @param  {String} formatString String representing the desired output format
   * @param  {Boolean} removeTimezone whether or not the local timezone information should be removed (UTC format)
   * @return {String} Output string of the formatted date or 'Invalid date'
   */
  Handlebars.registerHelper('formatDate', function(inputString, formatString, removeTimezone) {
    var inputDate = inputString;

    // If true convert to Number object because moment will fail; otherwise delegate to moment.
    if (isNumberString(inputDate)) {
      inputDate = Number(inputDate);
    }

    var day = moment(inputDate);

    if (typeof removeTimezone === 'boolean' && removeTimezone) {
      day = day.utc();
    }

    return day.format(formatString);
  });
};

