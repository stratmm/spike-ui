# Home page layout
Marionette = require 'backbone.marionette'
$ = require 'jquery'
EditExpView = require '../experience/edit/layout.coffee'
window.jQuery = require 'jquery'
Bootstrap = require 'bootstrap'

module.exports = Marionette.Layout.extend
  template: window.templates['src/app/templates/home/layout']

  className: "col-md-12 home-page-col"

  initialize: ->
    console.log("App.Views.Home.Layout::initialize")

  regions:
    'main': '#main-body'

  events:
    'mouseenter [tooltip]' : 'showTooltip'
    'mouseleave [tooltip]' : 'hideTooltip'

  showTooltip: (event) ->
    #console.log("App.Views.StaticPages.Home::showTooltip")
    $('[tooltip]').each((i,el) ->
      try
        $(el).tooltip()
      catch error
      )

    try
      $(event.target).tooltip('show')
    catch error

  hideTooltip: (event) ->
    #console.log("App.Views.StaticPages.Home::hideTooltip")
    try
      $(event.target).tooltip('hide')
    catch error

  onRender: ->
    view = new EditExpView
    @main.show(view)

