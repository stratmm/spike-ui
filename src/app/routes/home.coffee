# Home Page Router
Marionette = require 'backbone.marionette'
ViewHome = require '../views/home/layout.coffee'
DaysToShip = require '../models/days_to_ship.coffee'
ProductType = require '../models/product_type'
ExperienceType = require '../models/experience_type'

module.exports = Marionette.AppRouter.extend

  initialize: ->
    console.log("App.Routes.Home::initialize")
    @region_manager = new Marionette.RegionManager()
    @regions = @region_manager.addRegions({
      home: "#home-page-row"
      })

  routes:
    "": "homeShow"
    "factory": "runFactory"


  homeShow: ->
    console.log("App.Routes.Home::homeShow")
    console.log("Would have shown home")
    view = new ViewHome
    @regions.home.show(view)

  runFactory: ->
    new DaysToShip(title: "up to 2 Days", days: 2).save()
    new DaysToShip(title: "up to 4 Days", days: 4).save()
    new DaysToShip(title: "up to a week", days: 7).save()
    new DaysToShip(title: "up to two weeks", days: 14).save()

    new ProductType(title: "Experience").save()
    new ProductType(title: "Physical Product").save()
    new ProductType(title: "Subscription").save()

    new ExperienceType(title: "Day out").save()
    new ExperienceType(title: "Cooking lesson").save()
    new ExperienceType(title: "Coding classes").save()
