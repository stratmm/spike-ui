Marionette = require 'backbone.marionette'
$ = require 'jquery'
ListItemView = require './list_item.coffee'
Commands = require "../../../requires/commands.coffee"

module.exports = Marionette.CompositeView.extend
  template: window.templates['src/app/views/products/list/list']

  className: "products-list-list"

  initialize: ->
    console.log("views/products/list/list::initialize")
    @setCommandHandlers()

  itemViewContainer: '#item-view-container'

  itemView: ListItemView

  # Set up command handlers
  setCommandHandlers: ->
    # A new product has been added, add it to the collection
    Commands.setHandler("models/products/added_new", (product) =>
      @collection.add(product)
    )

    # Show details form
    Commands.setHandler("src/app/views/products/edit/layout/show_details", () =>
      view = new FormDetailsView(model: @model)
      @form.show(view)
    )
