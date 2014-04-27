# Home page layout
Marionette = require 'backbone.marionette'
$ = require 'jquery'


module.exports = Marionette.Layout.extend
  template: window.templates['src/app/views/products/edit/layout']

  className: "flow-layout"

  initialize: ->
    console.log("views/products/edit/layout.coffee::initialize")

  regions:
    'main': '#flow'

