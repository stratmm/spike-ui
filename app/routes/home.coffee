# Home Page Router
Marionette = require 'backbone.marionette'

module.exports = Marionette.AppRouter.extend

  initialize: ->
    console.log("App.Routes.Home::initialize")

  routes:
    "": "homeShow"


  homeShow: ->
    console.log("App.Routes.Home::homeShow")
    console.log("Would have shown home")


