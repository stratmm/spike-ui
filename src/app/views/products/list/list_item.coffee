Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"


module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/list/list_item']

  className: "products-list-list-item"

  tagName: "tr"

  initialize: ->
    console.log("views/products/list/list_item::initialize")
    @search_text = ""

  serializeData: ->
    return {
      'model': @model
    }

  modelEvents:
    'sync':  'render'

  events:
    'click .edit_link': 'doEdit'

  doEdit: (event) ->
    console.log("views/products/list/list_item::doEdit")
    event.stopPropagation()
    # Send the message to edit this product
    Commands.execute("src/app/views/home/layout/edit_product", @model)
