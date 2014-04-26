# Vendors
$ = require 'jquery'
Backbone = require 'backbone'
Backbone.$ = $
Marionette = require 'backbone.marionette'
Routes = require './app/routes/home.coffee'
Styles = require "./app/stylesheets/app.less"

# app bootstrap
app = new Marionette.Application()
app.addInitializer((options) ->
  appRouter = new Routes
  Backbone.history.start({ pushState: true })
)

app.start();

module.exports = app;

