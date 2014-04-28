Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"
$ = require 'jquery'
_ = require 'underscore'

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/edit/form_about']

  className: "products-edit-form "

  initialize: ->
    console.log("views/products/edit/form_about::initialize")

  serializeData: ->
    return {
      'model': @model
    }

  events:
    'change input': 'inputChanged'
    'change textarea': 'textareaChanged'

  inputChanged: (event) ->
    console.log("views/products/edit/form_about::inputChanged")
    input = $(event.currentTarget)
    if !_.isUndefined(input.data('model-attribute'))
      @model.set(input.data('model-attribute'), input.val())

  textareaChanged: (event) ->
    console.log("views/products/edit/form_about::textareaChanged")
    textarea = $(event.currentTarget)
    if !_.isUndefined(textarea.data('model-attribute'))
      @model.set(textarea.data('model-attribute'), textarea.val())
