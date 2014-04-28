  Backbone = require 'backbone'
  Backbone.IndexedDB = require 'backbone_indexeddb'
  window.Database = require '../database/indexdb.coffee'
  Model = require '../models/days_to_ship.coffee'


  module.exports = Backbone.Collection.extend

    storeName: 'days_to_ship'

    database: window.Database

    model: Model

