# Vendors
$ = require('jquery')
Backbone = require('backbone')
Backbone.$ = $
Marionette = require('backbone.marionette')

# app bootstrap
app = new Marionette.Application()

app.start();

Backbone.history.start();

module.exports = app;