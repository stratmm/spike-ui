(function() {
  if (window.templates == null) {
    window.templates = {};
  }

  window.templates['src/templates/home/layout'] = function(context) {
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
      $o.push("<div class='row'>\n  <div class='col-md-12' id='banner'>\n    <h1>");
      $o.push("      " + $e($c("Not On The High Street")));
      $o.push("      <small>\n        Spike UI\n      </small>\n    </h1>\n    <hr>\n  </div>\n</div>\n<div class='row'>\n  <div class='col-md-12' id='main-body'>");
      $o.push("    " + $e($c("Main Body Here")));
      $o.push("  </div>\n</div>");
      return $o.join("\n").replace(/\s([\w-]+)='true'/mg, ' $1').replace(/\s([\w-]+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");
    }).call(context);
  };

}).call(this);
