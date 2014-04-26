  Backbone = require 'backbone'
  Backbone.IndexedDB = require 'backbone-indexeddb'
  Database = require '../database/indexdb.coffee'
  Model = require '../models/product.coffee'


  module.exports = Backbone.Collection.extend

    storeName: 'products'

    database: Database

    url: "/"

    model: Model

