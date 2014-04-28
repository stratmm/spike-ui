Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"
$ = require 'jquery'

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/edit/tabs']

  className: "products-edit-tabs"

  initialize: ->
    console.log("views/products/edit/tabs::initialize")

  serializeData: ->
    return {
      'model': @model
    }

  ui:
    tabs: '.nav-tabs li
    '
  events:
    'click .nav-tabs li' : 'tabClicked'

  onRender: ->
    # When starting ask for the details view to be shown
    Commands.execute("src/app/views/products/edit/layout/show_about")


  tabClicked: (event) ->
    console.log("views/products/edit/tabs::tabClicked")

    tab = $(event.currentTarget)
    tab_name = tab.data('tab-name')
    console.log(tab_name)
    Commands.execute("src/app/views/products/edit/layout/show_tab", tab.data('tab-name'))

    # Set who is the active tab
    @ui.tabs.removeClass('active')
    tab.addClass('active')