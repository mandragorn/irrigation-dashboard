'use strict';

var DataService = require('./DataService');
var moistureCollection = require('../moisture/moistureCollection');

module.exports = new DataService({
  'moisture': moistureCollection
});
