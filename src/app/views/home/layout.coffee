# Home page layout
Marionette = require 'backbone.marionette'
$ = require 'jquery'
ProductEditView = require '../products/edit/layout.coffee'
ProductListView = require '../products/list/layout.coffee'
window.jQuery = require 'jquery'
Bootstrap = require 'bootstrap'
Products = require '../../collections/products.coffee'

module.exports = Marionette.Layout.extend
  template: window.templates['src/app/templates/home/layout']

  className: "col-md-12 home-page-col"

  initialize: ->
    console.log("views/home/layout.coffee::initialize")

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
    edit_view = new ProductEditView
    @main.show(edit_view)
    products = new Products
    products.fetch()
    list_view = new ProductListView(collection: products)
    @list.show(list_view)

