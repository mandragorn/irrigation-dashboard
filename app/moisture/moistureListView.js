var TorsoListView = require('torso/modules/ListView');
var BaseDataService = require('../data-utils/BaseDataService');
var moistureListTemplate = require('./moisture-list-template.hbs');
var moistureItemView = require('./moistureItemView');

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
            pageSize: 10
          }
        };
      }
    }
  ],

  initialize: function() {
    this.collection = this.getPrivateCollection('moisture');
    this.set('page', 1);
  },

  setPage: function(page) {
    page = page && Number(page);
    this.set('page', page);
  }
})))();
