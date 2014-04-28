Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"
$ = require 'jquery'
Pnotify = require 'jquery_pnotify'

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/edit/controls']

  className: "products-edit-controls"

  initialize: ->
    console.log("views/products/edit/controls::initialize")

  events:
    'click #save' : 'saveProduct'
    'click #cancel' : 'doClose'
    'click #delete' : 'doDelete'

  serializeData: ->
    return {
      'model': @model
    }

  doClose: (event) ->
    # Ask the parent layout to close
    Commands.execute("src/app/views/products/edit/layout/close")

  doDelete: (event) ->
    @model.destroy(success: =>
      Commands.execute("models/products/deleted", @model)
      @doClose()
      $.pnotify({
        title: "Product deleted",
        text: "Product #{@model.get('title')} was deleted",
        type: 'error',

        })
    )

  saveProduct: (event) ->
    console.log("views/products/edit/controls::saveProduct")

    # if a new model send out the message for any interested parties
    if @model.isNew()
      Commands.execute("models/products/added_new", @model)

    @model.save()
    @doClose()
