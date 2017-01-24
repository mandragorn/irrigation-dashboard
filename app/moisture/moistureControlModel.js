var TorsoModel = require('torso/modules/Model');


module.exports = new (TorsoModel.extend({
  url: '/moisture/control'
}))();
