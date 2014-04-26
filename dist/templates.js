(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/templates/home/layout'] = function(context) {
    return (function() {
      var $c, $e, $o;
      $e = function(text, escape) {
        return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
      };
      $c = function(text) {
        switch (text) {
          case null:
          case void 0:
            return '';
          case true:
          case false:
            return '' + text;
          default:
            return text;
        }
      };
      $o = [];
      $o.push("<div class='row'>\n  <div class='col-md-12' id='banner'>\n    <h1>\n      <span class='glyphicon glyphicon-bookmark' tooltip='tooltip' title='Testing that Glyphicon font includes are working' data-placement='right'></span>\n      <span tooltip='tooltip' title='This is a tooltip to test boostrap.js integration' data-placement='right'>");
      $o.push("        " + $e($c("Not On The High Street")));
      $o.push("      </span>\n      <small>\n        Spike UI\n      </small>\n    </h1>\n    <hr>\n  </div>\n</div>\n<div class='row'>\n  <div class='col-md-5' id='list'></div>\n  <div class='col-md-7' id='main-body'></div>\n</div>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/templates/products/edit/layout'] = function(context) {
    return (function() {
      var $c, $e, $o;
      $e = function(text, escape) {
        return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
      };
      $c = function(text) {
        switch (text) {
          case null:
          case void 0:
            return '';
          case true:
          case false:
            return '' + text;
          default:
            return text;
        }
      };
      $o = [];
      $o.push("<h2>");
      $o.push("  " + $e($c("Flow Layout here")));
      $o.push("</h2>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '');
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/templates/products/list/controls'] = function(context) {
    return (function() {
      var $c, $e, $o;
      $e = function(text, escape) {
        return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
      };
      $c = function(text) {
        switch (text) {
          case null:
          case void 0:
            return '';
          case true:
          case false:
            return '' + text;
          default:
            return text;
        }
      };
      $o = [];
      $o.push("<nav class='navbar navbar-default' role='navigation'>\n  <div class='navbar-header'>\n    <button class='navbar-toggle' type='button' data-toggle='collapse' data-target='#products-layout-controls'>\n      <span class='sr-only'>" + ($e($c("Toggle controls"))) + "</span>\n      <span class='icon-bar'></span>\n      <span class='icon-bar'></span>\n      <span class='icon-bar'></span>\n    </button>\n    <a class='navbar-brand' href='/'>" + ($e($c("Products"))) + "</a>\n  </div>\n  <div class='collapse navbar-collapse' id='orders-layout-controls'>\n    <form class='navbar-form navbar-left' role='search'>\n      <div class='form-group'>\n        <input class='form-control' id='search-text' type='text' placeholder='Search' value='" + ($c(this.search_text)) + "'>\n      </div>\n      <button class='btn btn-default' id='search-button' type='button' title='Free text search' tooltip='tooltip'>\n        <span class='glyphicon glyphicon-search'></span>\n      </button>\n      <div class='btn-group'>\n        <button class='btn btn-default' id='add' type='button'>\n          <span class='glyphicon glyphicon-plus'></span>");
      $o.push("          " + $e($c(" Add")));
      $o.push("        </button>\n      </div>\n    </form>\n  </div>\n</nav>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/templates/products/list/layout'] = function(context) {
    return (function() {
      var $c, $e, $o;
      $e = function(text, escape) {
        return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
      };
      $c = function(text) {
        switch (text) {
          case null:
          case void 0:
            return '';
          case true:
          case false:
            return '' + text;
          default:
            return text;
        }
      };
      $o = [];
      $o.push("<div class='row'>\n  <div class='col-md-12' id='controls'>");
      $o.push("    " + $e($c("loading controls...")));
      $o.push("  </div>\n</div>\n<div class='row'>\n  <div class='col-md-12' id='list'>");
      $o.push("    " + $e($c("loading list...")));
      $o.push("  </div>\n</div>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/templates/products/list/list'] = function(context) {
    return (function() {
      var $c, $e, $o;
      $e = function(text, escape) {
        return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
      };
      $c = function(text) {
        switch (text) {
          case null:
          case void 0:
            return '';
          case true:
          case false:
            return '' + text;
          default:
            return text;
        }
      };
      $o = [];
      $o.push("<div class='table-responsive'>\n  <table class='table table-striped'>\n    <thead>\n      <tr>\n        <th>" + ($e($c("Title"))) + "</th>\n        <th>" + ($e($c("Price"))) + "</th>\n      </tr>\n    </thead>\n    <tbody id='item-view-container'></tbody>\n  </table>\n</div>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/templates/products/list/list_item'] = function(context) {
    return (function() {
      var $c, $e, $o;
      $e = function(text, escape) {
        return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
      };
      $c = function(text) {
        switch (text) {
          case null:
          case void 0:
            return '';
          case true:
          case false:
            return '' + text;
          default:
            return text;
        }
      };
      $o = [];
      $o.push("<td>" + ($e($c(this.model.get('title')))) + "</td>\n<td>" + ($e($c(this.model.get('price')))) + "</td>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '');
    }).call(context);
  };

}).call(this);
