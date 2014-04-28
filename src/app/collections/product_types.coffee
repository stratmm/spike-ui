  Backbone = require 'backbone'
  Backbone.IndexedDB = require 'backbone_indexeddb'
  window.Database = require '../database/indexdb.coffee'
  Model = require '../models/product_type.coffee'


  module.exports = Backbone.Collection.extend

    storeName: 'product_types'

    database: window.Database

    model: Model

