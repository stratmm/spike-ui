Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"
$ = require 'jquery'
_ = require 'underscore'
ProductTypes = require '../../../collections/product_types'

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/edit/form_about']

  className: "products-edit-form "

  initialize: ->
    console.log("views/products/edit/form_about::initialize")
    @product_types = new ProductTypes
    @product_types.fetch(success: =>
      @render()
    )

  serializeData: ->
    return {
      'model': @model,
      'product_types': @product_types
    }

  events:
    'change input': 'inputChanged'
    'change textarea': 'inputChanged'
    'click .product_type_thumbnail': 'productTypeSelected'

  onRender: ->
    # Set the active product type
    $(".product_type_thumbnail").removeClass('active')
    $(".product_type_thumbnail[data-product-type='#{@model.get('product_type_id')}']").addClass('active')


  inputChanged: (event) ->
    console.log("views/products/edit/form_about::inputChanged")
    input = $(event.currentTarget)
    if !_.isUndefined(input.data('model-attribute'))
      @model.set(input.data('model-attribute'), input.val())

  productTypeSelected: (event) ->
    console.log("views/products/edit/form_about::productTypeSelected")
    thumbnail = $(event.currentTarget)
    @model.set('product_type_id', thumbnail.attr('data-product-type'))
    @render()