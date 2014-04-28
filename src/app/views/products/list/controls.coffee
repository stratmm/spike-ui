Marionette = require 'backbone.marionette'
$ = require 'jquery'
Product = require '../../../models/product.coffee'
Commands = require "../../../requires/commands.coffee"

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/list/controls']

  className: "products-list-controls"

  initialize: ->
    console.log("views/products/list/controls::initialize")
    @search_text = ""

  events:
    'click #add' : 'AddProduct'

  serializeData: ->
    return {
      'collection': @collection,
      'search_text': @search_text
    }

  AddProduct: (event) ->
    console.log("views/products/list/controls::AddProduct")
    event.stopPropagation()
    product = new Product()
    # Send the message to edit this product
    Commands.execute("src/app/views/home/layout/edit_product", product)
