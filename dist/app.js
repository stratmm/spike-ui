(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var $, Backbone, Marionette, Routes, app;

$ = require('jquery');

Backbone = require('backbone');

Backbone.$ = $;

Marionette = require('backbone.marionette');

Routes = require('./routes/home.coffee');

app = new Marionette.Application();

app.addInitializer(function(options) {
  var appRouter;
  appRouter = new Routes;
  return Backbone.history.start({
    pushState: true
  });
});

app.start();

module.exports = app;


},{"./routes/home.coffee":2,"backbone":false,"backbone.marionette":false,"jquery":false}],2:[function(require,module,exports){
var Marionette, ViewHome;

Marionette = require('backbone.marionette');

ViewHome = require('../views/home/layout.coffee');

module.exports = Marionette.AppRouter.extend({
  initialize: function() {
    console.log("App.Routes.Home::initialize");
    this.region_manager = new Marionette.RegionManager();
    return this.regions = this.region_manager.addRegions({
      home: "#home-page-row"
    });
  },
  routes: {
    "": "homeShow"
  },
  homeShow: function() {
    var view;
    console.log("App.Routes.Home::homeShow");
    console.log("Would have shown home");
    view = new ViewHome;
    return this.regions.home.show(view);
  }
});


},{"../views/home/layout.coffee":3,"backbone.marionette":false}],3:[function(require,module,exports){
var $, Marionette;

Marionette = require('backbone.marionette');

$ = require('jquery');

module.exports = Marionette.Layout.extend({
  template: window.templates['src/templates/home/layout'],
  className: "col-md-12 home-page-col",
  initialize: function() {
    return console.log("App.Views.Home.Layout::initialize");
  },
  regions: {
    'main': '#main'
  }
});


},{"backbone.marionette":false,"jquery":false}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdmFncmFudC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3ZhZ3JhbnQvc3JjL2FwcC5jb2ZmZWUiLCIvdmFncmFudC9zcmMvcm91dGVzL2hvbWUuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL3ZpZXdzL2hvbWUvbGF5b3V0LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBLElBQUEsb0NBQUE7O0FBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxRQUFSLENBQUosQ0FBQTs7QUFBQSxRQUNBLEdBQVcsT0FBQSxDQUFRLFVBQVIsQ0FEWCxDQUFBOztBQUFBLFFBRVEsQ0FBQyxDQUFULEdBQWEsQ0FGYixDQUFBOztBQUFBLFVBR0EsR0FBYSxPQUFBLENBQVEscUJBQVIsQ0FIYixDQUFBOztBQUFBLE1BSUEsR0FBUyxPQUFBLENBQVEsc0JBQVIsQ0FKVCxDQUFBOztBQUFBLEdBT0EsR0FBVSxJQUFBLFVBQVUsQ0FBQyxXQUFYLENBQUEsQ0FQVixDQUFBOztBQUFBLEdBUUcsQ0FBQyxjQUFKLENBQW1CLFNBQUMsT0FBRCxHQUFBO0FBQ2pCLE1BQUEsU0FBQTtBQUFBLEVBQUEsU0FBQSxHQUFZLEdBQUEsQ0FBQSxNQUFaLENBQUE7U0FDQSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQWpCLENBQXVCO0FBQUEsSUFBRSxTQUFBLEVBQVcsSUFBYjtHQUF2QixFQUZpQjtBQUFBLENBQW5CLENBUkEsQ0FBQTs7QUFBQSxHQWFHLENBQUMsS0FBSixDQUFBLENBYkEsQ0FBQTs7QUFBQSxNQWVNLENBQUMsT0FBUCxHQUFpQixHQWZqQixDQUFBOzs7O0FDQUEsSUFBQSxvQkFBQTs7QUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLHFCQUFSLENBQWIsQ0FBQTs7QUFBQSxRQUNBLEdBQVcsT0FBQSxDQUFRLDZCQUFSLENBRFgsQ0FBQTs7QUFBQSxNQUdNLENBQUMsT0FBUCxHQUFpQixVQUFVLENBQUMsU0FBUyxDQUFDLE1BQXJCLENBRWY7QUFBQSxFQUFBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFDVixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksNkJBQVosQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsY0FBRCxHQUFzQixJQUFBLFVBQVUsQ0FBQyxhQUFYLENBQUEsQ0FEdEIsQ0FBQTtXQUVBLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBQyxDQUFBLGNBQWMsQ0FBQyxVQUFoQixDQUEyQjtBQUFBLE1BQ3BDLElBQUEsRUFBTSxnQkFEOEI7S0FBM0IsRUFIRDtFQUFBLENBQVo7QUFBQSxFQU9BLE1BQUEsRUFDRTtBQUFBLElBQUEsRUFBQSxFQUFJLFVBQUo7R0FSRjtBQUFBLEVBV0EsUUFBQSxFQUFVLFNBQUEsR0FBQTtBQUNSLFFBQUEsSUFBQTtBQUFBLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSwyQkFBWixDQUFBLENBQUE7QUFBQSxJQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksdUJBQVosQ0FEQSxDQUFBO0FBQUEsSUFFQSxJQUFBLEdBQU8sR0FBQSxDQUFBLFFBRlAsQ0FBQTtXQUdBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQWQsQ0FBbUIsSUFBbkIsRUFKUTtFQUFBLENBWFY7Q0FGZSxDQUhqQixDQUFBOzs7O0FDQUEsSUFBQSxhQUFBOztBQUFBLFVBQUEsR0FBYSxPQUFBLENBQVEscUJBQVIsQ0FBYixDQUFBOztBQUFBLENBQ0EsR0FBSSxPQUFBLENBQVEsUUFBUixDQURKLENBQUE7O0FBQUEsTUFHTSxDQUFDLE9BQVAsR0FBaUIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFsQixDQUNmO0FBQUEsRUFBQSxRQUFBLEVBQVUsTUFBTSxDQUFDLFNBQVUsQ0FBQSwyQkFBQSxDQUEzQjtBQUFBLEVBRUEsU0FBQSxFQUFXLHlCQUZYO0FBQUEsRUFJQSxVQUFBLEVBQVksU0FBQSxHQUFBO1dBQ1YsT0FBTyxDQUFDLEdBQVIsQ0FBWSxtQ0FBWixFQURVO0VBQUEsQ0FKWjtBQUFBLEVBT0EsT0FBQSxFQUNFO0FBQUEsSUFBQSxNQUFBLEVBQVEsT0FBUjtHQVJGO0NBRGUsQ0FIakIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIyBWZW5kb3JzXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcbkJhY2tib25lLiQgPSAkXG5NYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcblJvdXRlcyA9IHJlcXVpcmUgJy4vcm91dGVzL2hvbWUuY29mZmVlJ1xuXG4jIGFwcCBib290c3RyYXBcbmFwcCA9IG5ldyBNYXJpb25ldHRlLkFwcGxpY2F0aW9uKClcbmFwcC5hZGRJbml0aWFsaXplcigob3B0aW9ucykgLT5cbiAgYXBwUm91dGVyID0gbmV3IFJvdXRlc1xuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHsgcHVzaFN0YXRlOiB0cnVlIH0pXG4pXG5cbmFwcC5zdGFydCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcDtcblxuIiwiIyBIb21lIFBhZ2UgUm91dGVyXG5NYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcblZpZXdIb21lID0gcmVxdWlyZSAnLi4vdmlld3MvaG9tZS9sYXlvdXQuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZFxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJBcHAuUm91dGVzLkhvbWU6OmluaXRpYWxpemVcIilcbiAgICBAcmVnaW9uX21hbmFnZXIgPSBuZXcgTWFyaW9uZXR0ZS5SZWdpb25NYW5hZ2VyKClcbiAgICBAcmVnaW9ucyA9IEByZWdpb25fbWFuYWdlci5hZGRSZWdpb25zKHtcbiAgICAgIGhvbWU6IFwiI2hvbWUtcGFnZS1yb3dcIlxuICAgICAgfSlcblxuICByb3V0ZXM6XG4gICAgXCJcIjogXCJob21lU2hvd1wiXG5cblxuICBob21lU2hvdzogLT5cbiAgICBjb25zb2xlLmxvZyhcIkFwcC5Sb3V0ZXMuSG9tZTo6aG9tZVNob3dcIilcbiAgICBjb25zb2xlLmxvZyhcIldvdWxkIGhhdmUgc2hvd24gaG9tZVwiKVxuICAgIHZpZXcgPSBuZXcgVmlld0hvbWVcbiAgICBAcmVnaW9ucy5ob21lLnNob3codmlldylcblxuXG5cbiIsIiMgSG9tZSBwYWdlIGxheW91dFxuTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuTGF5b3V0LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL3RlbXBsYXRlcy9ob21lL2xheW91dCddXG5cbiAgY2xhc3NOYW1lOiBcImNvbC1tZC0xMiBob21lLXBhZ2UtY29sXCJcblxuICBpbml0aWFsaXplOiAtPlxuICAgIGNvbnNvbGUubG9nKFwiQXBwLlZpZXdzLkhvbWUuTGF5b3V0Ojppbml0aWFsaXplXCIpXG5cbiAgcmVnaW9uczpcbiAgICAnbWFpbic6ICcjbWFpbidcblxuIl19
