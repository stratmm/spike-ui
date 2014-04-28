(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/views/home/layout'] = function(context) {
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

  window.templates['src/app/views/products/edit/controls'] = function(context) {
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
      $o.push("<nav class='navbar navbar-default' role='navigation'>\n  <div class='navbar-header'>\n    <button class='navbar-toggle' type='button' data-toggle='collapse' data-target='#products-layout-controls'>\n      <span class='sr-only'>" + ($e($c("Toggle controls"))) + "</span>\n      <span class='icon-bar'></span>\n      <span class='icon-bar'></span>\n      <span class='icon-bar'></span>\n    </button>\n    <a class='navbar-brand' href='/'>");
      if (this.model.isNew()) {
        $o.push("      " + $e($c("Create")));
      } else {
        $o.push("      " + $e($c("Edit ")));
      }
      $o.push("      " + $e($c(" Product")));
      $o.push("    </a>\n  </div>\n  <div class='collapse navbar-collapse' id='products-layout-controls'>\n    <form class='navbar-form navbar-right' role='controls'>\n      <div class='btn-group'>\n        <button class='btn btn-default' id='cancel' type='button' title='Cancel changes' tooltip='tooltip'>\n          <span class='glyphicon glyphicon-remove'></span>");
      $o.push("          " + $e($c(" Cancel")));
      $o.push("        </button>\n      </div>\n      <div class='btn-group'>\n        <button class='btn btn-primary' id='save' type='button' title='Save changes' tooltip='tooltip'>\n          <span class='glyphicon glyphicon-ok'></span>");
      $o.push("          " + $e($c(" Save")));
      $o.push("        </button>\n      </div>\n      <div class='btn-group'>\n        <button class='btn btn-danger' id='delete' type='button' title='Delete' tooltip='tooltip'>\n          <span class='glyphicon glyphicon-trash'></span>");
      $o.push("          " + $e($c(" Delete")));
      $o.push("        </button>\n      </div>\n    </form>\n  </div>\n</nav>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/views/products/edit/form_about'] = function(context) {
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
      $o.push("<form>\n  <div class='form-group'>\n    <label>");
      $o.push("      " + $e($c("Product title")));
      $o.push("    </label>\n    <input class='form-control' type='text' placeholder='Product title' value='" + ($c(this.model.get('title'))) + "' data-model-attribute='title'>\n  </div>\n  <div class='form-group'>\n    <label>");
      $o.push("      " + $e($c("Tell your customers about what the experience entails")));
      $o.push("    </label>\n    <textarea class='form-control' data-model-attribute='introduction'>");
      $o.push("    " + $e($c(this.model.get('introduction'))));
      $o.push("    </textarea>\n  </div>\n  <div class='form-group'>\n    <label>");
      $o.push("      " + $e($c("Price")));
      $o.push("    </label>\n    <input class='form-control' id='price' type='number' value='" + ($c(this.model.get('price'))) + "' data-model-attribute='price'>\n  </div>\n</form>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "").replace(/[\s\n]*\u0091/mg, '').replace(/\u0092[\s\n]*/mg, '');
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/views/products/edit/form_delivery'] = function(context) {
    return (function() {
      var $c, $e, $o, days, _i, _len, _ref;
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
      $o.push("<form>\n  <div class='form-group'>\n    <label>");
      $o.push("      " + $e($c("How long does it take for you to ship?")));
      $o.push("    </label>\n    <select class='form-control' id='days_to_ship' data-model-attribute='days_to_ship_id'>");
      _ref = this.days_to_ship_records.models;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        days = _ref[_i];
        $o.push("      <option class='days_to_ship_option' value='" + ($c(days.get('id'))) + "'>");
        $o.push("        " + $e($c(days.get('title'))));
        $o.push("      </option>");
      }
      $o.push("    </select>\n  </div>\n</form>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/views/products/edit/layout'] = function(context) {
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
      $o.push("    " + $e($c("Controls loading...")));
      $o.push("  </div>\n</div>\n<div class='row'>\n  <div class='col-md-12' id='tabs'>");
      $o.push("    " + $e($c("Tabs loading...")));
      $o.push("  </div>\n</div>\n<div class='row'>\n  <div class='col-md-12' id='form'>");
      $o.push("    " + $e($c("Forms loading...")));
      $o.push("  </div>\n</div>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/views/products/edit/tabs'] = function(context) {
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
      $o.push("<ul class='nav nav-tabs'>\n  <li class='active' data-tab-name='about'>\n    <a>");
      $o.push("      " + $e($c("About your product")));
      $o.push("    </a>\n  </li>\n  <li data-tab-name='delivery'>\n    <a>");
      $o.push("      " + $e($c("Delivery")));
      $o.push("    </a>\n  </li>\n  <li data-tab-name='details'>\n    <a>");
      $o.push("      " + $e($c("Details")));
      $o.push("    </a>\n  </li>\n  <li data-tab-name='need_to_know'>\n    <a>");
      $o.push("      " + $e($c("Need to know")));
      $o.push("    </a>\n  </li>\n  <li data-tab-name='preview'>\n    <a>");
      $o.push("      " + $e($c("Preview")));
      $o.push("    </a>\n  </li>\n</ul>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/app/views/products/list/controls'] = function(context) {
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
      $o.push("<nav class='navbar navbar-default' role='navigation'>\n  <div class='navbar-header'>\n    <button class='navbar-toggle' type='button' data-toggle='collapse' data-target='#products-layout-controls'>\n      <span class='sr-only'>" + ($e($c("Toggle controls"))) + "</span>\n      <span class='icon-bar'></span>\n      <span class='icon-bar'></span>\n      <span class='icon-bar'></span>\n    </button>\n    <a class='navbar-brand' href='/'>" + ($e($c("Products"))) + "</a>\n  </div>\n  <div class='collapse navbar-collapse' id='products-layout-controls'>\n    <form class='navbar-form navbar-left' role='search'>\n      <div class='form-group'>\n        <input class='form-control' id='search-text' type='text' placeholder='Search' value='" + ($c(this.search_text)) + "'>\n      </div>\n      <button class='btn btn-default' id='search-button' type='button' title='Free text search' tooltip='tooltip'>\n        <span class='glyphicon glyphicon-search'></span>\n      </button>\n      <div class='btn-group'>\n        <button class='btn btn-default' id='add' type='button' title='Add a new product' tooltip='tooltip'>\n          <span class='glyphicon glyphicon-plus'></span>");
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

  window.templates['src/app/views/products/list/layout'] = function(context) {
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

  window.templates['src/app/views/products/list/list'] = function(context) {
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

  window.templates['src/app/views/products/list/list_item'] = function(context) {
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
      $o.push("<td class='edit_link'>" + ($e($c(this.model.get('title')))) + "</td>\n<td class='edit_link'>" + ($e($c(this.model.get('price')))) + "</td>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
