Marionette = require 'backbone.marionette'
$ = require 'jquery'
Product = require '../../../models/product.coffee'

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
    product = new Product(title: "Test Title", price: 10.50)
    @collection.add(product)
    product.save()