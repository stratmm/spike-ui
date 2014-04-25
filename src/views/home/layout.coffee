# Home page layout
Marionette = require 'backbone.marionette'
$ = require 'jquery'

module.exports = Marionette.Layout.extend
  template: window.templates['src/templates/home/layout']

  className: "col-md-12 home-page-col"

  initialize: ->
    console.log("App.Views.Home.Layout::initialize")

  regions:
    'main': '#main'

