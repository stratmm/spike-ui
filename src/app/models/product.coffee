Backbone = require 'backbone'
Backbone.IndexedDB = require 'backbone-indexeddb'
Database = require '../database/indexdb.coffee'

module.exports = Backbone.Model.extend

  storeName: 'products'

  database: Database

  url: "/"

  defaults:
    title: ""
    price: 0.0

