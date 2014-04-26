Marionette = require 'backbone.marionette'
$ = require 'jquery'


module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/templates/products/list/controls']

  className: "products-list-controls"

  initialize: ->
    console.log("views/products/list/controls::initialize")
    @search_text = ""

  serializeData: ->
    return {
      'collection': @collection,
      'search_text': @search_text
    }