Marionette = require 'backbone.marionette'
$ = require 'jquery'

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/templates/products/list/list_item']

  className: "products-list-list-item"

  tagName: "tr"

  initialize: ->
    console.log("views/products/list/controls::initialize")
    @search_text = ""

  serializeData: ->
    return {
      'model': @model
    }