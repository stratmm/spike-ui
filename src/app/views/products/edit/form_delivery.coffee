Marionette = require 'backbone.marionette'
Commands = require "../../../requires/commands.coffee"
$ = require 'jquery'
_ = require 'underscore'
DaysToShips = require '../../../collections/days_to_ships.coffee'

module.exports = Marionette.ItemView.extend
  template: window.templates['src/app/views/products/edit/form_delivery']

  className: "products-edit-form "

  initialize: ->
    console.log("views/products/edit/form_delivery::initialize")
    @days_to_ship_records = new DaysToShips()
    @days_to_ship_records.fetch(success: =>
      console.log "loaded days to ships"
      @render()
    )

  ui:
    'days_select': '#days_to_ship'

  serializeData: ->
    return {
      'model': @model,
      'days_to_ship_records': @days_to_ship_records
    }

  events:
    'change input': 'inputChanged'
    'change textarea': 'textareaChanged'
    'change select': 'selectChanged'

  onRender: ->
    console.log("views/products/edit/form_delivery::onRender")
    console.log(@model.get('days_to_ship_id'))
    @ui.days_select.val(@model.get('days_to_ship_id'))



  inputChanged: (event) ->
    console.log("views/products/edit/form_delivery::inputChanged")
    input = $(event.currentTarget)
    if !_.isUndefined(input.data('model-attribute'))
      @model.set(input.data('model-attribute'), input.val())

  textareaChanged: (event) ->
    console.log("views/products/edit/form_delivery::textareaChanged")
    textarea = $(event.currentTarget)
    if !_.isUndefined(textarea.data('model-attribute'))
      @model.set(textarea.data('model-attribute'), textarea.val())

  selectChanged: (event) ->
    console.log("views/products/edit/form_delivery::selectChanged")
    select = $(event.currentTarget)
    if !_.isUndefined(select.data('model-attribute'))
      @model.set(select.data('model-attribute'), select.val())
