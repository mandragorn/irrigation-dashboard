/**
 * Functions related to easy data service access.
 * @module App.data-utils
 */

'use strict';
var _ = require('underscore');
var Backbone = require('backbone');
var DataServiceFunctionsSetup = require('./DataServiceFunctions');
var TorsoView = require('torso/modules/View');

var DataServiceFunctions;

/**
 * Mixin for Torso Views to provide convenient management of models
 * @class DataService
 * @author ben.pepper@vecna.com
 *
 * Configuration Documentation is located at https://wiki.vecna.com/display/SW/Torso+Data+Utils
 *
 * @param masterCollectionsByName Configuration object mapping model names to master collections
 * @constructor
 */
function DataService(masterCollectionsByName) {
  DataServiceFunctions = DataServiceFunctionsSetup(masterCollectionsByName);
}

DataService.prototype = {
  mixin: function(parent) {
    _.extend(parent, mixin);
    _.extend(parent, DataServiceFunctions);
    parent.initialize = _.wrap(parent.initialize || _.noop, initialize);
    parent.prepare = _.wrap(parent.prepare || _.noop, prepare);
    parent._dispose = _.wrap(parent._dispose || _.noop, _dispose);

    return parent;
  }
};

var mixin = {
  //Index of fetched models by alias
  __fetchedModels: null,
  //Private Torso collections for this view indexed by modelType
  __privateCollections: null,
  //Parsed version of dataModels indexed by alias
  __parsedDataModelsByAlias: null,

  //Private method to store fetched models, setup listeners on fetched models, and perform initial rendering after a new model is fetched
  __storeModel: function(model, alias, options) {
    options = options || {};
    var thisView = this;
    if (thisView.__fetchedModels[alias] !== model) {
      //Attach listeners if the is the first we have heard about this model
      thisView.__fetchedModels[alias] = model;

      if (_.isArray(model)) {
        _.each(model, function(individualModel) {
          thisView.__attachListeners(alias, individualModel);
        });
      } else {
        thisView.__attachListeners(alias, model);
      }
      thisView.__fetchDependentModels(alias);
    }
    thisView.trigger('fetched:' + alias, model);
    if (!options.noRender) {
      thisView.render();
    }
    return model;
  },

  //Private method to setup listeners to rerender on change
  __attachListeners: function (alias, model, options) {
    options = options || {};
    var thisView = this;
    var rerenderOnGeneralChangeEvents = !(options && options.ignoreGeneralChangeEvents);

    if (rerenderOnGeneralChangeEvents) {
      if (model instanceof Backbone.Model) {
        thisView.stopListening(model, 'change', thisView.render);
        thisView.listenTo(model, 'change', thisView.render);
      } else if (model instanceof Backbone.Collection) {
        thisView.stopListening(model, 'change add remove reset', thisView.render);
        thisView.listenTo(model, 'change add remove reset', thisView.render);
      }
    }
    _.each(thisView.__parsedDataModelsByAlias[alias].dependents, function(dependency) {
      thisView.stopListening(model, 'change:' + dependency.parentProperty, thisView.__parsedDataModelsByAlias[dependency.dependentAlias].fetch);
      thisView.listenTo(model, 'change:' + dependency.parentProperty, thisView.__parsedDataModelsByAlias[dependency.dependentAlias].fetch);
    });
  },

  //Private method to refetch dependent models on change
  __fetchDependentModels: function (alias) {
    var thisView = this;
    _.each(thisView.__parsedDataModelsByAlias[alias].dependents, function(dependency) {
      thisView.__parsedDataModelsByAlias[dependency.dependentAlias].fetch();
    });
  },

  //Private method that maps an alias to its model name/type
  __getModelNameFromAlias: function (alias) {
    var dataModel = this.__parsedDataModelsByAlias[alias];
    var modelType = dataModel && dataModel.modelType;
    if (!modelType) {
      //get it from this.dataModels directly if it hasn't been parsed yet
      var model = _.findWhere(this.dataModels, {alias: alias});
      modelType = model.modelType ? model.modelType : model.collectionType;
    }
    return modelType;
  }
};

/**
 * Wrap the parent initialize function in order to initialize the data service after parent initialize
 *
 * @method initialize
 * @param parentInitialize initialize function of the view we are mixing into
 * @param options Backbone initialization options
 */
function initialize(parentInitialize, options) {
  var thisView = this;

  /**
   * Initialize private variables
   */
  this.__privateCollections = {};
  this.__fetchedModels = {};
  this.__parsedDataModelsByAlias = {
    model: {
      alias: 'model',
      fetch: function() {
        return this.model;
      }.bind(thisView),
      dependents: [],
      parents: []
    },
    view: {
      alias: 'view',
      fetch: function() {
        return this.viewState;
      }.bind(thisView),
      dependents: [],
      parents: []
    }
  };

  parentInitialize.call(thisView, options);

  /**
   * Parse data models : Compile fetching functions and dependencies
   */
  var dependencies = [];
  var validationErrors = [];
  _.each(thisView.dataModels, function(dataModel) {

    if (!dataModel.alias) {
      validationErrors.push('"alias" must be defined for all dataModels');
      //Continue as other errors won't make sense without an alias
      return;
    }

    var parsedModel = {
      alias: dataModel.alias,
      modelType: null,
      isCollection: false,
      //True-fetch by criteria, False-fetchByIds
      isCriteria: false,
      //True-use pull to get models from the cache (pull from cache means only go to server for models that are not already cached)
      //False-use fetch to get models from the cache (fetch from cache means retrieve the models from the server every time)
      usePull: dataModel.usePull || false,
      //function which updates this model and stores it
      fetch: null,
      //Models dependent on this model
      dependents: [],
      //Models this model depends on
      parents: []
    };
    thisView.__parsedDataModelsByAlias[parsedModel.alias] = parsedModel;

    /**
     * Determine type of this model
     */
    if (dataModel.modelType) {
      parsedModel.modelType = dataModel.modelType;
    } else if (dataModel.collectionType) {
      parsedModel.modelType = dataModel.collectionType;
      parsedModel.isCollection = true;
    } else if (!dataModel.fetcher) {
      validationErrors.push('"modelType" or "collectionType" was not defined for dataModel : "' + dataModel.alias + '"');
    }
    if (parsedModel.modelType && !thisView.getMasterCollection([parsedModel.modelType])) {
      validationErrors.push('Invalid modelType or collectionType for "' + parsedModel.modelType + '" for dataModel ' + parsedModel.alias + '. Configure DataService, or fix your typo');
    }

    /**
     * Create a function which returns the id(s)/criteria for this model
     */
    var idFunction;
    if (dataModel.id || dataModel.ids) {
      var id = dataModel.id || dataModel.ids;
      if (typeof id === 'function') {
        idFunction = function() {
          return id.call(thisView);
        };
      } else {
        idFunction = function() {
          return id;
        };
      }
    } else if (dataModel.idProperty) {
      var parentAlias = dataModel.idProperty.split(':')[0];
      var parentProperty = dataModel.idProperty.split(':')[1];
      if (!(parentAlias && parentProperty)) {
        validationErrors.push('Invalid idProperty "' + dataModel.idProperty + '" on dataModel "' + dataModel.alias + '"');
      }

      dependencies.push({dependentAlias: dataModel.alias, parentAlias: parentAlias, parentProperty: parentProperty});
      idFunction = function() {
        var parentModel = thisView.__fetchedModels[parentAlias];
        if (parentModel) {
          if (_.isArray(parentModel)) {
            return _.map(parentModel, function(individualParentModel) {
              return individualParentModel.get(parentProperty);
            });
          } else {
            return parentModel.get(parentProperty);
          }
        } else {
          return undefined;
        }
      };
    } else if (dataModel.criteria) {
      parsedModel.isCriteria = true;
      if (typeof dataModel.criteria === 'function') {
        idFunction = function() {
          return dataModel.criteria.call(thisView);
        };
      } else {
        idFunction = function() {
          return dataModel.criteria;
        };
      }
    } else if (dataModel.fetcher) {
      //If there is a fetcher but no explicit id function, we always want to fetch
      idFunction = function() {
        return true;
      };
    }

    /**
     * Setup fetching functions for this model
     */

    //Determine which fetching function to use base on whether we're getting one/many models with criteria/ids
    var fetcherFunction;
    if (dataModel.fetcher) {
      fetcherFunction = dataModel.fetcher;
    } else if (parsedModel.isCriteria && parsedModel.isCollection) {
      fetcherFunction = thisView.fetchModelsByCriteria;
    } else if (parsedModel.isCriteria && !parsedModel.isCollection) {
      fetcherFunction = thisView.fetchModelByCriteria;
    } else if (!parsedModel.isCriteria && parsedModel.isCollection) {
      fetcherFunction = thisView.fetchModelsByIds;
    } else {
      fetcherFunction = thisView.fetchModelById;
    }

    parsedModel.fetch = function(options) {
      var ids = idFunction();
      var model;
      //isEmpty handles strings, objects, and arrays, but always returns false for numbers and booleans
      if (_.isNumber(ids) || _.isBoolean(ids) || !_.isEmpty(ids)) {
        //Call the proper fetch function if ids exist
        try {
          // Allow the fetcher functions access to the private collection that the ids are being fetched for.
          var fetchOptions = _.extend({
            privateCollection: this.getPrivateCollection(parsedModel.alias)
          }, options);
          model = fetcherFunction.call(thisView, parsedModel.alias, ids, fetchOptions);
        } catch (err) {
          thisView.trigger('fetchError:' + parsedModel.alias, err);
        }
        if (model && model.then) {
          model.then(function(model) {
            thisView.__storeModel(model, parsedModel.alias);
          });
        } else if (model) {
          thisView.__storeModel(model, parsedModel.alias);
        }
      }
      if (!model) {
        //If model was not fetched or was null, clear out this model and refetch any dependencies, likely clearing them out as well
        var fetchedModel = thisView.__fetchedModels[parsedModel.alias];
        if (fetchedModel) {
          delete thisView.__fetchedModels[parsedModel.alias];
          _.each(parsedModel.dependents, function(dependency) {
            var dependent = thisView.__parsedDataModelsByAlias[dependency.dependentAlias];
            if (dependent) {
              dependent.fetch();
            }
          });
          thisView.render();
        }
      }
    }.bind(thisView);

    //Process explicit dependencies
    _.each(dataModel.dependencies, function(dependency) {
      var dependencyParts = dependency.split(':');
      if (dependencyParts.length !== 2) {
        validationErrors.push('Invalid dependency "' + dependency + '" on dataModel "' + dataModel.alias + '"');
        return;
      }

      var parentAlias = dependencyParts[0];
      var parentProperty = dependencyParts[1];

      if (!thisView.__parsedDataModelsByAlias[parentAlias]) {
        validationErrors.push('Invalid dependency on "' + dataModel.alias + '" : "' + parentAlias + '"');
      }
      dependencies.push({dependentAlias: dataModel.alias, parentAlias: parentAlias, parentProperty: parentProperty});
    });
  });


  //Setup view.model and view.viewState as models
  var modelAlias = 'model';
  var viewAlias = 'view';
  thisView.__fetchedModels[modelAlias] = this.model;
  thisView.__fetchedModels[viewAlias] = this.viewState;

  //Create a bidirectional relation for each dependency
  _.each(dependencies, function(dependency) {
    var parentModel = thisView.__parsedDataModelsByAlias[dependency.parentAlias];
    var dependentModel = thisView.__parsedDataModelsByAlias[dependency.dependentAlias];
    parentModel.dependents.push(dependency);
    dependentModel.parents.push(dependency);
  });

  //Attach listeners to view.model and view.viewState
  thisView.__attachListeners('view', this.viewState, {ignoreGeneralChangeEvents: true});
  thisView.__attachListeners('model', this.model, {ignoreGeneralChangeEvents: true});
  thisView.__fetchDependentModels('view');
  thisView.__fetchDependentModels('model');

  //Stop if validation didn't succeed
  if (validationErrors.length) {
    throw 'Error parsing data models:\n' + validationErrors.join('\n  ');
  }

  /**
   * Perform initial fetching for root level data models
   */
  _.each(thisView.__parsedDataModelsByAlias, function(parsedDataModel) {
    if (!parsedDataModel.parents.length) {
      parsedDataModel.fetch();
    }
  });
}

/**
 * Wrap parent's prepare method to add each dataModel to the context keyed by alias
 * @param parentPrepare parent's prepare method to wrap
 */
function prepare(parentPrepare) {
  var thisView = this;
  var defaultTemplateContext = _.object(_.map(this.dataModels, function(dataModel) {
    var fetchedModel = thisView.__fetchedModels[dataModel.alias];
    if (fetchedModel && fetchedModel.toJSON) {
      return [dataModel.alias, fetchedModel.toJSON()];
    } else {
      return [dataModel.alias, fetchedModel];
    }
  }));
  //Temporary stopgap until we do proper inheritance to call the default torso prepare
  var torsoDefault = TorsoView.prototype.prepare.apply(this);
  torsoDefault.formErrors = (_.size(this._errors) !== 0) ? this._errors : null;
  torsoDefault.formSuccess = this._success;
  return _.extend(torsoDefault, defaultTemplateContext, parentPrepare.call(thisView));
}


/**
 * Wrap parent's dispose method to dispose of private collections on view dispose
 * @param parentDispose
 */
function _dispose(parentDispose) {
  _.each(this.__privateCollections, function(collection) {
    collection.dispose();
  });
  parentDispose.call(this);
}

module.exports = DataService;
