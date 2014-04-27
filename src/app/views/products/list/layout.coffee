Marionette = require 'backbone.marionette'
$ = require 'jquery'
ControlsView = require './controls.coffee'
ListView = require './list.coffee'

module.exports = Marionette.Layout.extend
  template: window.templates['src/app/views/products/list/layout']

  className: "products-list-layout"

  initialize: ->
    console.log("views/products/list/layout::initialize")
    @controls_view = new ControlsView(collection: @collection)
    @list_view = new ListView(collection: @collection)
  regions:
    'controls': '#controls'
    "list": '#list'

  onRender: ->
    @controls.show(@controls_view)
    @list.show(@list_view)



