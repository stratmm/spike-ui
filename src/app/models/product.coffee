Backbone = require 'backbone'
Backbone.IndexedDB = require 'backbone_indexeddb'
window.Database = require '../database/indexdb.coffee'

module.exports = Backbone.Model.extend

  storeName: 'products'

  database: window.Database

  defaults:
    title: ""
    price: 0.0
    introduction: ""
    days_to_ship_id: null
    sentence: ""
    product_type_id: null
    experience_type_id: null



