# Home Page Router
Marionette = require 'backbone.marionette'
ViewHome = require '../views/home/layout.coffee'

module.exports = Marionette.AppRouter.extend

  initialize: ->
    console.log("App.Routes.Home::initialize")
    @region_manager = new Marionette.RegionManager()
    @regions = @region_manager.addRegions({
      home: "#home-page-row"
      })

  routes:
    "": "homeShow"


  homeShow: ->
    console.log("App.Routes.Home::homeShow")
    console.log("Would have shown home")
    view = new ViewHome
    @regions.home.show(view)



