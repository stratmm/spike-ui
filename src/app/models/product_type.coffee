Backbone = require 'backbone'
Backbone.IndexedDB = require 'backbone_indexeddb'
window.Database = require '../database/indexdb.coffee'

module.exports = Backbone.Model.extend

  storeName: 'product_types'

  database: window.Database

  defaults:
    title: ""
    image_url: ""

