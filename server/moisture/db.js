var dbGenerator = require('../db/generator');

/**
 * Singleton access to the moisture DB.
 * @class db
 * @static
 * @author jyoung
 */
module.exports = dbGenerator('moisture');
