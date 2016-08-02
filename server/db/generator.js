/**
 * Common code for interacting with postgres databases.
 * @module Server.db
 */
var knex = require('knex');
var bookshelf = require('bookshelf');

process.stderr.on('data', function(data) {
  console.error(data); // eslint-disable-line no-console
});

/**
 * Creates a bookshelf.js instance for the given db.
 *
 * Automatically includes the pagination plugin.
 *
 * @class generator
 * @constructor
 * @param db_name {String} the name of the db to setup this bookshelf instance for.
 * @author jyoung
 */
module.exports = function(db_name) {
  var knexInstance = knex({
    client: 'pg',
    connection: {
      host     : 'localhost',
      user     : 'root',
      password : 'z3gr1nch',
      database : db_name,
      charset  : 'utf8'
    }
  });

  var bookshelfInstance = bookshelf(knexInstance, {debug: true});
  bookshelfInstance.plugin('pagination');
  return bookshelfInstance;
};
