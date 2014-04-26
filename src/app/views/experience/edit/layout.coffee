# Home page layout
Marionette = require 'backbone.marionette'
$ = require 'jquery'
window.jQuery = require 'jquery'
Bootstrap = require 'bootstrap'

module.exports = Marionette.Layout.extend
  template: window.templates['src/app/templates/experience/edit/layout']

  className: "flow-layout"

  initialize: ->
    console.log("App.Views.Experience.Edit.Layout::initialize")

  regions:
    'main': '#flow'

