  Backbone = require 'backbone'
  Backbone.IndexedDB = require 'backbone_indexeddb'
  window.Database = require '../database/indexdb.coffee'
  Model = require '../models/product.coffee'


  module.exports = Backbone.Collection.extend

    storeName: 'products'

    database: window.Database

    model: Model

