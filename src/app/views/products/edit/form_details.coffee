Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"
$ = require 'jquery'
_ = require 'underscore'
ProductTypes = require '../../../collections/product_types'

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/edit/form_details']

  className: "products-edit-form "

  initialize: ->
    console.log("views/products/edit/form_details::initialize")

  serializeData: ->
    return {
      'model': @model
    }


  events:
    'change input': 'inputChanged'
    'change textarea': 'inputChanged'


  inputChanged: (event) ->
    console.log("views/products/edit/form_details::inputChanged")
    input = $(event.currentTarget)
    if !_.isUndefined(input.data('model-attribute'))
      @model.set(input.data('model-attribute'), input.val())
