# Home page layout
Marionette = require 'backbone.marionette'
$ = require 'jquery'
jQuery = require 'jquery'
ProductEditView = require '../products/edit/layout.coffee'
ProductListView = require '../products/list/layout.coffee'
window.jQuery = require 'jquery'
Bootstrap = require 'bootstrap'
Products = require '../../collections/products.coffee'
Commands = require "../../requires/commands.coffee"

Pnotify = require 'jquery_pnotify'

# Set up notifications
$.pnotify.defaults.history = false
$.pnotify.defaults.styling = "bootstrap"


module.exports = Marionette.Layout.extend
  template: window.templates['src/app/views/home/layout']

  className: "col-md-12 home-page-col"

  initialize: ->
    console.log("views/home/layout.coffee::initialize")
    @setCommandHandlers()

  regions:
    'main': '#main-body'
    'list': "#list"

  events:
    'mouseenter [tooltip]' : 'showTooltip'
    'mouseleave [tooltip]' : 'hideTooltip'

  showTooltip: (event) ->
    $('[tooltip]').each((i,el) ->
      try
        $(el).tooltip()
      catch error
      )

    try
      $(event.target).tooltip('show')
    catch error

  hideTooltip: (event) ->
    try
      $(event.target).tooltip('hide')
    catch error

  onRender: ->
    # show the product list view
    products = new Products
    products.fetch()
    list_view = new ProductListView(collection: products)
    @list.show(list_view)

  # Set up command handlers
  setCommandHandlers: ->
    Commands.setHandler("src/app/views/home/layout/edit_product", (product) =>
      edit_view = new ProductEditView(model: product)
      @main.show(edit_view)
    )



