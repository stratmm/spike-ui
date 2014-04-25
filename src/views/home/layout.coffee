# Home page layout
P = require 'autoresolve'
Marionette = require 'backbone.marionette'
$ = require 'jquery'
EditExpView = require P 'experience/edit/layout.coffee'

module.exports = Marionette.Layout.extend
  template: window.templates['src/templates/home/layout']

  className: "col-md-12 home-page-col"

  initialize: ->
    console.log("App.Views.Home.Layout::initialize")

  regions:
    'main': '#main-body'

  onRender: ->
    view = new EditExpView
    @main.show(view)
