/**
 * @module Server.Moisture
 */
var moistureBookshelf = require('./db');
var _ = require('lodash');

/**
 * Serializes a timestamp in-place on an object for a single property.
 * @method serializeTimestamp
 * @private
 * @param object {Object} the object containing the timestamp property to serialize.
 * @param property {String} the name of the property to serialize.
 */
function serializeTimestamp(object, property) {
  if (object && property) {
    var timestampAsDate = object[property];
    var timestampAsMs = timestampAsDate && timestampAsDate.getTime();
    object[property] = timestampAsMs;
  }
}

/**
 * Serializes multiple timestamp properties as defined in the properties array.
 * @method serializeTimestamps
 * @private
 * @param object {Object} the object containing the timestamp properties to serialize.
 * @param properties {Array[String]} the names of the properties to serialize.
 */
function serializeTimestamps(object, properties) {
  if (object && properties) {
    _.forEach(properties, function(property) {
      serializeTimestamp(object, property);
    });
  }
}

/**
 * Deserializes a timestamp in-place on an object for a single property.
 * @method deserializeTimestamp
 * @private
 * @param object {Object} the object containing the timestamp property to deserialize.
 * @param property {String} the name of the property to deserialize.
 */
function deserializeTimestamp(object, property) {
  if (object && property) {
    var timestampAsMs = object[property];
    var timestampAsDate = timestampAsMs && new Date(timestampAsMs);
    object[property] = timestampAsDate;
  }
}

/**
 * Deserializes multiple timestamp properties as defined in the properties array.
 * @method deserializeTimestamps
 * @private
 * @param object {Object} the object containing the timestamp properties to deserialize.
 * @param properties {Array[String]} the names of the properties to deserialize.
 */
function deserializeTimestamps(object, properties) {
  if (object && properties) {
    _.forEach(properties, function(property) {
      deserializeTimestamp(object, property);
    });
  }
}

/**
 * DB model for the moisture object.
 * @class MoistureModel
 * @constructor
 * @author jyoung
 */
var MoistureModel = moistureBookshelf.Model.extend({
  tableName: 'moisture',
  hasTimestamps: true,
  /**
   * @method initialize
   * @override
   */
  initialize: function() {
    this.on('updating', function() { throw 'Updating existing Moisture objects is not permitted.'; });
  },
  /**
   * @method serialize
   * @override
   */
  serialize: function() {
    var serializedModel = moistureBookshelf.Model.prototype.serialize.apply(this);
    serializeTimestamps(serializedModel, ['created_at', 'updated_at']);
    return serializedModel;
  }
},{
  /**
   * Class level method that creates a moisture model from the DTO.
   * @method deserialize
   * @param moistureAsJson {Object} the properties of the mosture object in DTO form.
   * @return {MoistureModel} a newly created mositure model with the values ready for saving to the db.
   */
  deserialize: function(moistureAsJson) {
    deserializeTimestamps(moistureAsJson, ['created_at', 'updated_at']);
    return MoistureModel.forge(moistureAsJson);
  }
});

module.exports = MoistureModel;
