var TorsoView = require('torso/modules/View');
var moistureItemTemplate = require('./moisture-item-template.hbs');

module.exports = TorsoView.extend({
  tagName: 'li',
  template: moistureItemTemplate,
});
