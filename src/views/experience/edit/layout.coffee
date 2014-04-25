# Home page layout
Marionette = require 'backbone.marionette'
$ = require 'jquery'

module.exports = Marionette.Layout.extend
  template: window.templates['src/templates/experience/edit/layout']

  className: "flow-layout"

  initialize: ->
    console.log("App.Views.Experience.Edit.Layout::initialize")

  regions:
    'main': '#flow'

