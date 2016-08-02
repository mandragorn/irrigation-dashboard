'use strict';

var _ = require('underscore');

/**
 * Public functions for DataService.js
 * All functions must be called from the context of a torso view
 * @class DataServiceFunctions
 * @author ben.pepper@vecna.com
 */
module.exports = function (masterCollectionsByName) {
  return {
    /**
     * Force fetching a given alias.  Effectively refreshes the cache with all items associated with the given alias.
     * @method forceFetch
     * @param alias {String} of the model to be fetched.
     */
    forceFetch: function(alias) {
      var dataModel = this.__parsedDataModelsByAlias[alias];
      dataModel.fetch();
    },

    /**
     * Convenience method to get a fetched property from a model, returning undefined if the model has not been fetched
     * @method getFetchedProperty
     * @param alias {String} alias of the model
     * @param propertyName {String} name of the property to get
     * @returns {Object} value of the property, or undefined if the model has not been fetched
     */
    getFetchedProperty: function (alias, propertyName) {
      var fetchedModel = this.__fetchedModels[alias];
      if (!fetchedModel) {
        return undefined;
      } else {
        return fetchedModel.get(propertyName);
      }
    },

    /**
     * @method getFetched
     * @param alias {String} alias of the model to get
     * @returns {Backbone.Model} the model, or undefined if the model has not been fetched
     */
    getFetched: function (alias) {
      return this.__fetchedModels[alias];
    },

    /**
     * @method getPrivateCollection
     * @param alias {String} alias of the model
     * @returns {Torso.Collection} private torso collection specific to this view and model type
     */
    getPrivateCollection: function (alias) {
      var modelName = this.__getModelNameFromAlias(alias);
      if (!this.__privateCollections[alias]) {
        this.__privateCollections[alias] = masterCollectionsByName[modelName].createPrivateCollection(this.cid + alias);
      }
      return this.__privateCollections[alias];
    },

    /**
     * @method getMasterCollection
     * @param modelName {String} type of the model
     * @returns {Torso.Collection} master torso collection for the given model type
     */
    getMasterCollection: function (modelName) {
      return masterCollectionsByName[modelName];
    },

    /**
     * Fetch the specified models
     * @method fetchModelsByIds
     * @param alias {String} name of alias to be fetched
     * @param ids {String[]} ids of models to be fetched
     * @param [options] {Object} options to apply to this specific fetch.
     *   @param [options.forceFetch=null] {Boolean} if set to true the fetch method will force a fetch
     * @returns {Promise} which resolves to an array of models
     */
    fetchModelsByIds: function (alias, ids, options) {
      options = options || {};
      var modelName = this.__getModelNameFromAlias(alias);

      if (!masterCollectionsByName[modelName]) {
        throw 'No model found by name : ' + modelName;
      }
      var privateCollection = this.getPrivateCollection(alias);
      var uniqueIds = _.unique(ids);
      var dataModel = this.__parsedDataModelsByAlias[alias];
      var useFetch = !dataModel.usePull || options.forceFetch;
      var trackAndRetrieveFunction = useFetch ? 'trackAndFetch' : 'trackAndPull';

      return privateCollection[trackAndRetrieveFunction](uniqueIds).then(function () {
        return privateCollection.filter(function (model) {
          return _.contains(uniqueIds, model.id);
        });
      });
    },

    /**
     * Fetch the specified models
     * @method fetchModelsByCriteria
     * @param alias {String} name of alias to be fetched
     * @param criteria {Object} criteria with which to restrict fetched models
     * @param options {Object} options to apply to this specific fetch.
     *   @param options.privateCollection {TorsoCollection} the private collection for which this fetch was initiated.
     * @returns {Promise} which resolves to an array of models
     */
    fetchModelsByCriteria: function (alias, criteria, options) {
      var thisView = this;
      var modelName = this.__getModelNameFromAlias(alias);
      return this.fetchIdsByCriteria(modelName, criteria, options).then(function (ids) {
        return thisView.fetchModelsByIds(alias, ids);
      });
    },

    /**
     * Fetch the model ids using the specified criteria
     * @method fetchIdsByCriteria
     * @param modelName {String} name of model type to be fetched
     * @param criteria {Object} criteria with which to restrict fetched ids
     * @param options {Object} options to apply to this specific fetch.
     *   @param options.privateCollection {TorsoCollection} the private collection for which this fetch was initiated.
     * @returns {Promise} which resolves to an array of ids
     */
    fetchIdsByCriteria: function (modelName, criteria, options) {
      if (!masterCollectionsByName[modelName]) {
        throw 'No model found by name : ' + modelName;
      }
      return masterCollectionsByName[modelName].fetchIdsByCriteria(criteria, options);
    },

    /**
     * Fetch a singular model using the specified criteria
     * @method fetchModelByCriteria
     * @param alias {String} name of alias to be fetched
     * @param criteria {*} criteria with which to identify the model
     * @param options {Object} options to apply to this specific fetch.
     *   @param options.privateCollection {TorsoCollection} the private collection for which this fetch was initiated.
     * @returns {Promise} which resolves to a model
     * @throws an error if the number of models retrieved != 1
     */
    fetchModelByCriteria: function (alias, criteria, options) {
      return this.fetchModelsByCriteria(alias, criteria, options).then(function (fetchedModels) {
        if (fetchedModels.length !== 1) {
          throw 'Error fetching ' + alias + ' with criteria ' + criteria + ' : Expected 1 result, found ' + fetchedModels.length;
        }
        return fetchedModels[0];
      });
    },

    /**
     * Fetch the given model
     * @method fetchModelById
     * @param alias {String} name of alias to be fetched
     * @param id {Number} id of the model to fetch
     * @returns {Promise} which resolves to a model
     */
    fetchModelById: function (alias, id) {
      return this.fetchModelsByIds(alias, [id]).then(function (fetchedModels) {
        if (fetchedModels.length !== 1) {
          throw 'Error fetching ' + alias + ' with id ' + id + ' : Expected 1 result, found ' + fetchedModels.length;
        }
        return fetchedModels[0];
      });
    }
  };
};
