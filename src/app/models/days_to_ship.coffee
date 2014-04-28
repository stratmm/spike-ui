Backbone = require 'backbone'
Backbone.IndexedDB = require 'backbone_indexeddb'
window.Database = require '../database/indexdb.coffee'

module.exports = Backbone.Model.extend

  storeName: 'days_to_ship'

  database: window.Database

  defaults:
    title: ""
    days: 1
