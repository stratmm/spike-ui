# Home page layout
Marionette = require 'backbone.marionette'
ControlsView = require './controls.coffee'
FormAboutView = require './form_about.coffee'
FormDeliveryView = require './form_delivery.coffee'
FormDetailsView = require './form_details.coffee'
TabsView = require './tabs.coffee'
Commands = require "../../../requires/commands.coffee"

module.exports = Marionette.Layout.extend
  template: window.templates['src/app/views/products/edit/layout']

  className: "product-edit-layout"

  initialize: ->
    console.log("views/products/edit/layout.coffee::initialize")
    @controls_view = new ControlsView(model: @model)
    @tabs_view = new TabsView(model: @model)
    @setCommandHandlers()

  regions:
    'controls': '#controls'
    'tabs': '#tabs'
    'form': '#form'

  tab_constructors: {
     delivery: FormDeliveryView
     about: FormAboutView
     details: FormDetailsView
     # tab: FormDeliveryView
     # tab: FormDeliveryView
  }

  onRender: ->
    @controls.show(@controls_view)
    @tabs.show(@tabs_view)

  # Set up command handlers
  setCommandHandlers: ->
    # close command
    Commands.setHandler("src/app/views/products/edit/layout/close", () =>
      @close()
    )

    # Show about form
    Commands.setHandler("src/app/views/products/edit/layout/show_about", () =>
      view = new FormAboutView(model: @model)
      @form.show(view)
    )


    # Show tab
    Commands.setHandler("src/app/views/products/edit/layout/show_tab", (tag_name) =>
      view = new @tab_constructors[tag_name](model: @model)
      @form.show(view)
    )


