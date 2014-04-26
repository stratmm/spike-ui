(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var $, Backbone, Marionette, Routes, app;

$ = require('jquery');

Backbone = require('backbone');

Backbone.$ = $;

Marionette = require('backbone.marionette');

Routes = require('./app/routes/home.coffee');

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


},{"./app/routes/home.coffee":2,"backbone":false,"backbone.marionette":false,"jquery":false}],2:[function(require,module,exports){
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


},{"../views/home/layout.coffee":4,"backbone.marionette":false}],3:[function(require,module,exports){
var $, Bootstrap, Marionette;

Marionette = require('backbone.marionette');

$ = require('jquery');

window.jQuery = require('jquery');

Bootstrap = require('bootstrap');

module.exports = Marionette.Layout.extend({
  template: window.templates['src/app/templates/experience/edit/layout'],
  className: "flow-layout",
  initialize: function() {
    return console.log("App.Views.Experience.Edit.Layout::initialize");
  },
  regions: {
    'main': '#flow'
  }
});


},{"backbone.marionette":false,"bootstrap":false,"jquery":false}],4:[function(require,module,exports){
var $, Bootstrap, EditExpView, Marionette;

Marionette = require('backbone.marionette');

$ = require('jquery');

EditExpView = require('../experience/edit/layout.coffee');

window.jQuery = require('jquery');

Bootstrap = require('bootstrap');

module.exports = Marionette.Layout.extend({
  template: window.templates['src/app/templates/home/layout'],
  className: "col-md-12 home-page-col",
  initialize: function() {
    return console.log("App.Views.Home.Layout::initialize");
  },
  regions: {
    'main': '#main-body'
  },
  events: {
    'mouseenter [tooltip]': 'showTooltip',
    'mouseleave [tooltip]': 'hideTooltip'
  },
  showTooltip: function(event) {
    var error;
    $('[tooltip]').each(function(i, el) {
      var error;
      try {
        return $(el).tooltip();
      } catch (_error) {
        error = _error;
      }
    });
    try {
      return $(event.target).tooltip('show');
    } catch (_error) {
      error = _error;
    }
  },
  hideTooltip: function(event) {
    var error;
    try {
      return $(event.target).tooltip('hide');
    } catch (_error) {
      error = _error;
    }
  },
  onRender: function() {
    var view;
    view = new EditExpView;
    return this.main.show(view);
  }
});


},{"../experience/edit/layout.coffee":3,"backbone.marionette":false,"bootstrap":false,"jquery":false}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdmFncmFudC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3ZhZ3JhbnQvc3JjL2FwcC5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL3JvdXRlcy9ob21lLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvZXhwZXJpZW5jZS9lZGl0L2xheW91dC5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL3ZpZXdzL2hvbWUvbGF5b3V0LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBLElBQUEsb0NBQUE7O0FBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxRQUFSLENBQUosQ0FBQTs7QUFBQSxRQUNBLEdBQVcsT0FBQSxDQUFRLFVBQVIsQ0FEWCxDQUFBOztBQUFBLFFBRVEsQ0FBQyxDQUFULEdBQWEsQ0FGYixDQUFBOztBQUFBLFVBR0EsR0FBYSxPQUFBLENBQVEscUJBQVIsQ0FIYixDQUFBOztBQUFBLE1BSUEsR0FBUyxPQUFBLENBQVEsMEJBQVIsQ0FKVCxDQUFBOztBQUFBLEdBT0EsR0FBVSxJQUFBLFVBQVUsQ0FBQyxXQUFYLENBQUEsQ0FQVixDQUFBOztBQUFBLEdBUUcsQ0FBQyxjQUFKLENBQW1CLFNBQUMsT0FBRCxHQUFBO0FBQ2pCLE1BQUEsU0FBQTtBQUFBLEVBQUEsU0FBQSxHQUFZLEdBQUEsQ0FBQSxNQUFaLENBQUE7U0FDQSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQWpCLENBQXVCO0FBQUEsSUFBRSxTQUFBLEVBQVcsSUFBYjtHQUF2QixFQUZpQjtBQUFBLENBQW5CLENBUkEsQ0FBQTs7QUFBQSxHQWFHLENBQUMsS0FBSixDQUFBLENBYkEsQ0FBQTs7QUFBQSxNQWVNLENBQUMsT0FBUCxHQUFpQixHQWZqQixDQUFBOzs7O0FDQUEsSUFBQSxvQkFBQTs7QUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLHFCQUFSLENB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LENBQUMsSUFBZixDQUFvQixTQUFDLENBQUQsRUFBRyxFQUFILEdBQUE7QUFDbEIsVUFBQSxLQUFBO0FBQUE7ZUFDRSxDQUFBLENBQUUsRUFBRixDQUFLLENBQUMsT0FBTixDQUFBLEVBREY7T0FBQSxjQUFBO0FBRVUsUUFBSixjQUFJLENBRlY7T0FEa0I7SUFBQSxDQUFwQixDQUFBLENBQUE7QUFNQTthQUNFLENBQUEsQ0FBRSxLQUFLLENBQUMsTUFBUixDQUFlLENBQUMsT0FBaEIsQ0FBd0IsTUFBeEIsRUFERjtLQUFBLGNBQUE7QUFFVSxNQUFKLGNBQUksQ0FGVjtLQVJXO0VBQUEsQ0FkYjtBQUFBLEVBMEJBLFdBQUEsRUFBYSxTQUFDLEtBQUQsR0FBQTtBQUVYLFFBQUEsS0FBQTtBQUFBO2FBQ0UsQ0FBQSxDQUFFLEtBQUssQ0FBQyxNQUFSLENBQWUsQ0FBQyxPQUFoQixDQUF3QixNQUF4QixFQURGO0tBQUEsY0FBQTtBQUVVLE1BQUosY0FBSSxDQUZWO0tBRlc7RUFBQSxDQTFCYjtBQUFBLEVBZ0NBLFFBQUEsRUFBVSxTQUFBLEdBQUE7QUFDUixRQUFBLElBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxHQUFBLENBQUEsV0FBUCxDQUFBO1dBQ0EsSUFBQyxDQUFBLElBQUksQ0FBQyxJQUFOLENBQVcsSUFBWCxFQUZRO0VBQUEsQ0FoQ1Y7Q0FEZSxDQU5qQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIjIFZlbmRvcnNcbiQgPSByZXF1aXJlICdqcXVlcnknXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuQmFja2JvbmUuJCA9ICRcbk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuUm91dGVzID0gcmVxdWlyZSAnLi9hcHAvcm91dGVzL2hvbWUuY29mZmVlJ1xuXG4jIGFwcCBib290c3RyYXBcbmFwcCA9IG5ldyBNYXJpb25ldHRlLkFwcGxpY2F0aW9uKClcbmFwcC5hZGRJbml0aWFsaXplcigob3B0aW9ucykgLT5cbiAgYXBwUm91dGVyID0gbmV3IFJvdXRlc1xuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHsgcHVzaFN0YXRlOiB0cnVlIH0pXG4pXG5cbmFwcC5zdGFydCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcDtcblxuIiwiIyBIb21lIFBhZ2UgUm91dGVyXG5NYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcblZpZXdIb21lID0gcmVxdWlyZSAnLi4vdmlld3MvaG9tZS9sYXlvdXQuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZFxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJBcHAuUm91dGVzLkhvbWU6OmluaXRpYWxpemVcIilcbiAgICBAcmVnaW9uX21hbmFnZXIgPSBuZXcgTWFyaW9uZXR0ZS5SZWdpb25NYW5hZ2VyKClcbiAgICBAcmVnaW9ucyA9IEByZWdpb25fbWFuYWdlci5hZGRSZWdpb25zKHtcbiAgICAgIGhvbWU6IFwiI2hvbWUtcGFnZS1yb3dcIlxuICAgICAgfSlcblxuICByb3V0ZXM6XG4gICAgXCJcIjogXCJob21lU2hvd1wiXG5cblxuICBob21lU2hvdzogLT5cbiAgICBjb25zb2xlLmxvZyhcIkFwcC5Sb3V0ZXMuSG9tZTo6aG9tZVNob3dcIilcbiAgICBjb25zb2xlLmxvZyhcIldvdWxkIGhhdmUgc2hvd24gaG9tZVwiKVxuICAgIHZpZXcgPSBuZXcgVmlld0hvbWVcbiAgICBAcmVnaW9ucy5ob21lLnNob3codmlldylcblxuXG5cbiIsIiMgSG9tZSBwYWdlIGxheW91dFxuTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xud2luZG93LmpRdWVyeSA9IHJlcXVpcmUgJ2pxdWVyeSdcbkJvb3RzdHJhcCA9IHJlcXVpcmUgJ2Jvb3RzdHJhcCdcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkxheW91dC5leHRlbmRcbiAgdGVtcGxhdGU6IHdpbmRvdy50ZW1wbGF0ZXNbJ3NyYy9hcHAvdGVtcGxhdGVzL2V4cGVyaWVuY2UvZWRpdC9sYXlvdXQnXVxuXG4gIGNsYXNzTmFtZTogXCJmbG93LWxheW91dFwiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcIkFwcC5WaWV3cy5FeHBlcmllbmNlLkVkaXQuTGF5b3V0Ojppbml0aWFsaXplXCIpXG5cbiAgcmVnaW9uczpcbiAgICAnbWFpbic6ICcjZmxvdydcblxuIiwiIyBIb21lIHBhZ2UgbGF5b3V0XG5NYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbiQgPSByZXF1aXJlICdqcXVlcnknXG5FZGl0RXhwVmlldyA9IHJlcXVpcmUgJy4uL2V4cGVyaWVuY2UvZWRpdC9sYXlvdXQuY29mZmVlJ1xud2luZG93LmpRdWVyeSA9IHJlcXVpcmUgJ2pxdWVyeSdcbkJvb3RzdHJhcCA9IHJlcXVpcmUgJ2Jvb3RzdHJhcCdcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkxheW91dC5leHRlbmRcbiAgdGVtcGxhdGU6IHdpbmRvdy50ZW1wbGF0ZXNbJ3NyYy9hcHAvdGVtcGxhdGVzL2hvbWUvbGF5b3V0J11cblxuICBjbGFzc05hbWU6IFwiY29sLW1kLTEyIGhvbWUtcGFnZS1jb2xcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJBcHAuVmlld3MuSG9tZS5MYXlvdXQ6OmluaXRpYWxpemVcIilcblxuICByZWdpb25zOlxuICAgICdtYWluJzogJyNtYWluLWJvZHknXG5cbiAgZXZlbnRzOlxuICAgICdtb3VzZWVudGVyIFt0b29sdGlwXScgOiAnc2hvd1Rvb2x0aXAnXG4gICAgJ21vdXNlbGVhdmUgW3Rvb2x0aXBdJyA6ICdoaWRlVG9vbHRpcCdcblxuICBzaG93VG9vbHRpcDogKGV2ZW50KSAtPlxuICAgICNjb25zb2xlLmxvZyhcIkFwcC5WaWV3cy5TdGF0aWNQYWdlcy5Ib21lOjpzaG93VG9vbHRpcFwiKVxuICAgICQoJ1t0b29sdGlwXScpLmVhY2goKGksZWwpIC0+XG4gICAgICB0cnlcbiAgICAgICAgJChlbCkudG9vbHRpcCgpXG4gICAgICBjYXRjaCBlcnJvclxuICAgICAgKVxuXG4gICAgdHJ5XG4gICAgICAkKGV2ZW50LnRhcmdldCkudG9vbHRpcCgnc2hvdycpXG4gICAgY2F0Y2ggZXJyb3JcblxuICBoaWRlVG9vbHRpcDogKGV2ZW50KSAtPlxuICAgICNjb25zb2xlLmxvZyhcIkFwcC5WaWV3cy5TdGF0aWNQYWdlcy5Ib21lOjpoaWRlVG9vbHRpcFwiKVxuICAgIHRyeVxuICAgICAgJChldmVudC50YXJnZXQpLnRvb2x0aXAoJ2hpZGUnKVxuICAgIGNhdGNoIGVycm9yXG5cbiAgb25SZW5kZXI6IC0+XG4gICAgdmlldyA9IG5ldyBFZGl0RXhwVmlld1xuICAgIEBtYWluLnNob3codmlldylcblxuIl19
