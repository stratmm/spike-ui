Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"
$ = require 'jquery'
_ = require 'underscore'
ProductTypes = require '../../../collections/product_types'
ExperienceTypes = require '../../../collections/experience_types'


module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/edit/form_about']

  className: "products-edit-form "

  initialize: ->
    console.log("views/products/edit/form_about::initialize")
    @expierence_id = null
    @product_types = new ProductTypes
    @product_types.fetch(success: (collection, response, options) =>
      for pt in collection.models
        if pt.get('title') == "Experience"
          @expierence_id = pt.get('id')
      @render()
    )
    @experience_types = new ExperienceTypes
    @experience_types.fetch(success: (collection, response, options) =>
      @render()
    )

    @expierence_selected = false

  ui:
    'experience_type_select': '#experience_type'


  serializeData: ->
    return {
      'model': @model,
      'product_types': @product_types
      'experience_types': @experience_types,
      'expierence_id': @expierence_id
    }

  events:
    'change input': 'inputChanged'
    'change select': 'inputChanged'
    'change textarea': 'inputChanged'
    'click .product_type_thumbnail': 'productTypeSelected'


  onRender: ->
    console.log('src/app/views/products/edit/form_about::onRender')
    console.log(@product_types)
    # Set the active product type
    $(".product_type_thumbnail").removeClass('active')
    $(".product_type_thumbnail[data-product-type='#{@model.get('product_type_id')}']").addClass('active')
    @ui.experience_type_select.val(@model.get('experience_type_id'))


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



