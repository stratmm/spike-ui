Marionette = require 'backbone.marionette'
$ = require 'jquery'
ListItemView = require './list_item.coffee'

module.exports = Marionette.CompositeView.extend
  template: window.templates['src/app/views/products/list/list']

  className: "products-list-list"

  initialize: ->
    console.log("views/products/list/list::initialize")

  itemViewContainer: '#item-view-container'

  itemView: ListItemView