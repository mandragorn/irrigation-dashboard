var TorsoListView = require('torso/modules/ListView');
var BaseDataService = require('../data-utils/BaseDataService');
var moistureListTemplate = require('./moisture-list-template.hbs');
var moistureItemView = require('./moistureItemView');

var PAGE_SIZE = 100;

module.exports = new (TorsoListView.extend(BaseDataService.mixin({
  tagName: 'ul',
  template: moistureListTemplate,

  itemView: moistureItemView,
  itemContainer: 'moisture-list-items',

  dataModels: [
    {
      alias: 'moisture',
      collectionType: 'moisture',
      dependencies: ['view:page'],
      criteria: function() {
        return {
          pagination: {
            page: this.get('page'),
            pageSize: this.get('pageSize')
          }
        };
      }
    }
  ],

  initialize: function() {
    this.collection = this.getPrivateCollection('moisture');
    this.set('page', 1);
    this.set('pageSize', PAGE_SIZE);
  },

  setPage: function(page) {
    page = page && Number(page);
    this.set('page', page);
  }
})))();
