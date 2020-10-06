(function() {  // Randall Farmer, twotwotwo at gmail.  Public domain, 2007-2011.
  var esc = function(str) { 
    return str.replace( // escape for query string
        // Escape everything the way App Engine escapes it for us (ugh thanks)
        /[^-A-Za-z0-9_. ]/g,
        ///[\\&%\n\r'"<>+=.*#;()]/g, 
        function(c) { 
            if ( c.charCodeAt(0) < 128 ) {
                var code = c.charCodeAt(0).toString(16);
                if ( code.length == 1 ) code = '0' + code;
                return ('%' + code).toUpperCase();
            }
            else { // utf8 bidness
                return encodeURIComponent(c[0]).toUpperCase()
            }
        } 
    ).replace(/ /g, '+');

    var s = escape(str); 
    return s.replace(/\+/g, '%2B') 
  };
  var escFN = function(str) { 
    return str.replace( // escape for query filename
        /[\\&%\n\r'"<>+=.*#;_?]/g, 
        function(c) { 
            var code = c.charCodeAt(0).toString(16);
            if ( code.length == 1 ) code = '0' + code;
            return '_' + code;
        } 
    ).replace(/ /g, '.');

    var s = escape(str); 
    return s.replace(/\+/g, '%2B') 
  };
  var escHTML = function(str) {
    return str.replace( // escape for HTML attribute
        /[\'\"<>\=\$\\]/g, 
        function(c) { return '&#' + c.charCodeAt(0) + ';' } 
    );
  };
  var mathUrls = {};
  var mathRegExp = 
    /\$\$(.|\n)*?\$\$|\B\$[^<$]*?\$\B|\\\((.|\n)*?\\\)|\\\[(.|\n)*?\\\]|\[tex\].*?\[\/tex\]/g;
  var mathRegExp2 = 
    /(\$\$(.|\n)*?\$\$|\B\$[^<$]*?\$\B|\\\((.|\n)*?\\\)|\\\[(.|\n)*?\\\]|\[tex\].*?\[\/tex\])/;

  if ( !window.mathSite ) 
    window.mathSite = window.location.hostname + window.location.pathname + 
      window.location.search;
  if ( !window.mathServer ) 
    window.mathServer = '//replacemath.appspot.com/?tex=';
    //window.mathServer = 'http://d2giytj84v93ol.cloudfront.net/!tex='
    //window.mathServer = 'http://d14tuuai04l1r3.cloudfront.net/!tex=';
  if ( !window.mathPreamble ) window.mathPreamble = '\\large \\parstyle ';
  if ( !window.noAutoPng 
       && !/MSIE [56]/.test(navigator.userAgent) 
       && !/\\png /.test(window.mathPreamble) ) 
      window.mathPreamble += '\\png ';

  if ( /!/.test(window.mathServer) ) esc = escFN;
  
  var haveSVG = 
      document.createElementNS
      && document.createElementNS('http://www.w3.org/2000/svg', 'svg').viewBox
      && !window.mathDisableSVG 
      // Need these features for inline SVG hack
      && DOMParser
      && document.querySelector
      && document.getElementsByTagName('head').length
      && !/disableSVG/.test(window.location.search);
  
  var dataImg;
  if ( !haveSVG ) {
      dataImg = new Image(); // dataImg.width==1 detects data: URI support
      dataImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  }
  
  var haveCORS = window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest();
  var haveXDR = window.XDomainRequest;
  var havePOST = haveCORS || haveXDR;
  // Essentially, IE9 and modern browsers. IE8 should be able to but has a 
  // problem (and one that's a pain to nail down w/o a proper IE8 install -- 
  // maybe stricter origin validation than others, or event.origin probs)
  var canUseIframe = (
	havePOST && 
	window.postMessage && 
	window.JSON && 
	haveSVG && // excludes IE8 for now
	false
  );
  
  // If we can neither do SVG nor get images in a batch, plain image
  // replacement is best
  var legacy = window.mathForceLegacy || !(haveSVG || havePOST);
  
  var div = document.createElement('div');
  var $L = function(i) { if ( window.console ) window.console.log(i) }
  
  var isMath = window.mathChecker || function( mathText ) {
      if ( window.mathNoDollar )
          return /^(\$\$|\\\(|\\\[|\[tex\])/.test(mathText);
      if ( /[_\\^]|\$\$|\w\(|\[tex\]/.test(mathText) ) 
      	  return true;
      if ( /[A-Za-z]{2,} [A-Za-z]{2,}/.test(mathText) )
          return false;
      if ( !!/^\$[ \t\n]/.test(mathText) != !!/[ \t\n]\$$/.test(mathText) )
          return false;
      return true;
  };
  
  if ( !window.mathRequests )
      window.mathRequests = {};
  if ( !window.mathRequestList )
      window.mathRequestList = [];
  if ( typeof(window.maxMathID) == 'undefined' )
      window.maxMathID = 0;
  
  var replacement = function( mathHtml ) {
    div.innerHTML = mathHtml;
    var mathText = div.firstChild.nodeValue;
    mathText = mathText.replace(/[\r\n]+/g, ' ');
    mathText = mathText.replace(/\xA0/g, ' ');
    mathText = mathText.replace(/\u2013/g, '-');
    mathText = mathText.replace(/\\hbar/g, '\\hbar{}'); // bust cache
    mathText = mathText.replace(/  +/g, ' ');
    if ( !isMath(mathText) ) return mathHtml;
    
    mathText = mathText.replace(/\[\/?tex\]/g, ' $ ');
	var num = maxMathID++;
	var id = "math" + num;
	var html = '<span class="math" id="' + id+ '">' 
			   + mathHtml 
			   + '</span>';
    
	if ( legacy ) {
        var src = mathServer + esc( mathPreamble + mathText );
        if ( /msie [56]/i.test(navigator.userAgent) || window.mathForceLegacy )
            src += '&fmt=gif'; // it's good for you
        var alt = escHTML(mathText);
        var img = new Image();
        // Closes over arguments
        function imageLoader(id, mathText, src) {
          return function() {
            var span = document.getElementById( id );
            if ( !span ) {
              $L('No span with ID ' + ids[i]);
              return;
            }
            var style = '';
            var imgHtml ="<img class='mathimg' src='"+src+"' alt='" +
                          alt + "' title='" + alt + "'"+style+" />";
            span.innerHTML = imgHtml;
          };
        }
        img.onload = imageLoader(id, mathText, src);
        img.src = src;
	}
	else {
		if ( !mathRequests[mathText] ) {
			mathRequests[mathText] = [];
			mathRequestList.push(mathText);
		}
		mathRequests[mathText].push('math'+num);
	}
	return html;
  }
  var hasAnyProperties = function(hash) {
    for ( key in hash )
      if ( hash.hasOwnProperty(key) )
        return true;
    return false;
  }
  var createScriptTag = function(texurl) {
    var s = document.createElement('script');
    s.type='text/javascript';
    document.getElementsByTagName('head')[0].appendChild(s);
    texurl=texurl.replace(/^http:\/\/mathcache.appspot.com/, 'http://replacemath.appspot.com');
    s.src = texurl;
  }
  
  var ifrMessageQueue = [];
  function createIFrame() {
    var ifrDiv = document.createElement('div');
    ifrDiv.innerHTML = '<iframe src="http://s3.amazonaws.com/replacemath/retriever.html" style="position: absolute; left:-999px;"></iframe>';
    var ifr = window.mathFrame = ifrDiv.getElementsByTagName('iframe')[0];
    ifr.onload = function() {
      for ( var i = 0; i < ifrMessageQueue.length; ++i ) {
        ifr.contentWindow.postMessage(ifrMessageQueue[i], 'http://s3.amazonaws.com');
      }
      ifrMessageQueue = {push: function(msg) {
        ifr.contentWindow.postMessage(msg, 'http://s3.amazonaws.com');
      }}
    }
    document.body.appendChild(ifrDiv);
    function gotMathMessage(evt) {
      if ( evt.source && evt.source !== ifr.contentWindow ) return;
      if ( evt.origin != 'http://s3.amazonaws.com' ) return;
      var data = JSON.parse(evt.data);
      var fn = data.fn;
      delete data.fn;
      if ( fn == 'onSVGResponse' ) onSVGResponse(data);
      else if ( fn == 'onURLResponse' ) onURLResponse(data);
      else if ( window.console ) console.log('unexpected function name ' + fn);
    }
    
    if ('addEventListener' in window)
      window.addEventListener('message',gotMathMessage,true);
    else
      window.attachEvent('onmessage',gotMathMessage);
  }
  function iFrameReq(msg) {
    if (!window.mathFrame) createIFrame();
    ifrMessageQueue.push(msg);
  }

  // Send batches of SVG requests, for cache only
  var sendMathRequests = function(cbinfo) {
    var baseURL = mathServer.replace(/\btex=/, cbinfo 
                                               // + '&url=' + esc(window.location.toString()) 
                                               + '&pre=' + esc(mathPreamble) );
    // Put TeX in an array, with the stuff appearing first in the doc 
    // requested first
    var i = 0;
    while ( i < mathRequestList.length ) {
      var url = baseURL, snippetsInURL = 0;
      for ( 1; i < mathRequestList.length; ++i ) {
        var tex = mathRequestList[i];
        var newURL = url + '&tex=' + esc( tex );
        ++snippetsInURL;
        // GET up to what App Engine (and IE) allow
        if ( newURL.length > 900 &&
             snippetsInURL > 1 &&
             !canUseIframe ) break;
        url = newURL;
      }
      
      // It ain't clear that this works -- I see requests in the logs that
      
      //url += '&cached_only=1';
      if ( canUseIframe ) {  // try S3 then POST to GAE
        // split off query string
        pieces = /(.*?)\?(.*)/.exec(url);
        var base = pieces[1];
        var query = pieces[2];
        iFrameReq(query);
      }
      else {
        createScriptTag(url);
      }
    }

  }
  
  var reRequestSVG = function(tex) {
      var SVGBaseURL = mathServer.replace(/\btex=/, 'svgcb=onSVGResponse'
                                                    //+ '&url=' + esc(window.location.toString()) 
                                                    + '&pre=' + esc(mathPreamble) );
      var url = SVGBaseURL + '&tex=' + esc ( tex );
      createScriptTag(url);
      // party
  }
  
  // For each flavor and font size
  // viewBox.y, viewBox.height, svg.height, font size, descender space
  var fontSizeInfo = {
      fig2dev: {
          '\\small': [2137.6, 167, 12.2, 10, -2.2],
          '': [2120.9, 183.7, 13.42, 11.5, -3.5],
          '\\large': [2087.5, 217.1, 15.86, 14.5, -3.86],
          '\\Large': [2070.8, 250.5, 18.3, 15, -3.3]
      },
      pydvi2svg: {
          '\\small': [175.03, 10.114, 10.114, 10, -2.2],
          '': [175.412, 11.238, 11.238, 11.5, -3.5],
          '\\large': [176.177, 13.47, 13.47, 14.5, 0],
          '\\Large': [179.096, 16.164, 16.164, 15, -3.3]
      }
  }
  window.onURLResponse = function( texToRendering ) {
    for ( tex in texToRendering ) {
      var src = texToRendering[tex];
      // Automatic URLs look like:
      /* var src = mathUrls[mathPreamble + mathText] || 
                (mathServer + esc( mathPreamble + mathText ));*/
      var ids = mathRequests[tex];
      for ( var i = 0; i < ids.length; ++i ) {
        if ( !ids ) {
          $L('Returned TeX ' + tex + ' did not match anything!')
          continue;
        }
        var id = ids[i];
        var alt = escHTML(tex);
        var img = new Image();
        // Closes over arguments
        function imageLoader(id, tex, src) {
          return function() {
            var span = document.getElementById( id );
            if ( !span ) {
              $L('No span with ID ' + ids[i]);
              return;
            }
            var imgHtml ="<img class='mathimg' src='"+src+"' alt='" +
                          alt + "' title='" + alt + "' />";
            span.innerHTML = imgHtml;
          };
        }
        img.onload = imageLoader(id, tex, src);
        img.src = src;
      }
    }
  }
  window.onSVGResponse = function( texToRendering ) {
    for ( tex in texToRendering ) {
      if ( !texToRendering.hasOwnProperty(tex) ) continue;
      if ( texToRendering[tex] == undefined ) {
          // We asked for cached and this wasn't cached
          reRequestSVG(tex);
          continue;
      }
      var ids = mathRequests[tex];
      if ( !ids ) {
        $L('Returned TeX ' + tex + ' did not match anything!')
        continue;
      }
      for ( var i = 0; i < ids.length; ++i ) {
        if ( !ids[i] ) continue;
        var span = document.getElementById( ids[i] );
        if ( !span ) {
          $L('span #' + ids[i] + ' not found :(')
          continue;
        }
        ids[i] = undefined;
        var svgEl=(new DOMParser).parseFromString(texToRendering[tex],'text/xml');
        var n = document.adoptNode(svgEl.querySelector('svg'));

        // We generated two flavors of svg (fig2dev and pydvi2svg) with 
        // different coord conventions and sizes.
        var svgFlavor = /^<\?xml version="1\.0" \?>/.test(texToRendering[tex]) ? 'pydvi2svg' : 'fig2dev'; 
        
        // It'd make me really happy if this could be replaced with 
        // something simpler.
        
        // For inline math:
        //   - scale it to match surrounding font size
        //   - extend height to include descender space if needed
        //   - apply vertical-align to push it into descender space
        if ( !/\\\[|\$\$/.test(tex) && svgFlavor != 'pydvi2svg' ) {
            try {
            var newFlavor = svgFlavor == 'pydvi2svg';
            // Get font size out of mathPreamble
            var size = '';
            var sizeMatch = /\\(small|large|Large)/.exec(mathPreamble);
            if ( sizeMatch )
                size = sizeMatch[0];
            var measurements = fontSizeInfo[svgFlavor][size];
            var contextFontSize = parseFloat(getComputedStyle(span, null).fontSize) * 3/4;
            var contextFontFamily = getComputedStyle(span, null).fontFamily;
            // Scale the svg to match surrounding size
            var scale = contextFontSize / measurements[3];
            var descenderSpace = measurements[4];
            // Some "screen fonts" have way different proportions from Computer 
            // Modern.  This is voodoo, not real matching.
            if ( /Verdana|Trebuchet|Myriad|Georgia|Helvetica|sans/i.test(contextFontFamily) ) {
                scale *= 1.25;
                descenderSpace += 1;
            }
            //n.style.zoom = scale;
            // Extend the height to include ascender and descender space
            var viewBox = n.viewBox.baseVal;
            // Ascender side
            var additionalHeightNeeded = (
                viewBox.y - measurements[0]
            );
            if ( additionalHeightNeeded > 0.01 ) {
                viewBox.y = measurements[0];
                viewBox.height += additionalHeightNeeded;
                n.height.baseVal.valueInSpecifiedUnits 
                    += additionalHeightNeeded / (newFlavor ? 1 : 13.63);
            }
            // Descender side
            additionalHeightNeeded = (
                (measurements[0] + measurements[1])
                - (viewBox.y + viewBox.height)
            );
            if ( additionalHeightNeeded > 0.01 ) {
                n.height.baseVal.valueInSpecifiedUnits 
                    += additionalHeightNeeded / (newFlavor ? 1 : 13.63);
                viewBox.height += additionalHeightNeeded;
            }
            // Push SVG down into descender territory
            n.style.verticalAlign = (descenderSpace * scale / contextFontSize * 100) + '%';
            n.height.baseVal.valueInSpecifiedUnits *= scale;
            n.width.baseVal.valueInSpecifiedUnits *= scale;
            } catch(e) {if(window.console)console.log(e)}
        }
        else if (!/\\\[|\$\$/.test(tex)) {
            try {
            // Get font size out of mathPreamble
            var size = '';
            var sizeMatch = /\\(small|large|Large)/.exec(mathPreamble);
            if ( sizeMatch )
                size = sizeMatch[0];
            var measurements = fontSizeInfo[svgFlavor][size];
            var descenderSpace = measurements[4];
            var contextFontSize = parseFloat(getComputedStyle(span, null).fontSize) * .9;
            var contextFontFamily = getComputedStyle(span, null).fontFamily;
            // Scale the svg to match surrounding size
            var scale = contextFontSize / measurements[3];
            var descenderSpace = measurements[4];
            // Some "screen fonts" have way different proportions from Computer 
            // Modern.  This is voodoo, not real matching.
            if ( /Verdana|Trebuchet|Myriad|Georgia|Helvetica|sans/i.test(contextFontFamily) ) {
                scale *= 1.25;
                //descenderSpace += 1;
            }
            // Push SVG down into descender territory
            //n.style.verticalAlign = (descenderSpace * scale / contextFontSize * 100) + '%';
            n.height.baseVal.valueInSpecifiedUnits *= scale;
            n.width.baseVal.valueInSpecifiedUnits *= scale;
            } catch(e) {if(window.console)console.log(e)}
        }
        span.innerHTML = '';
        span.appendChild(n);
      }
    }
  }

  if ( !window.mathCleaner ) window.mathCleaner = function(orig) {
      var best = orig;
      var cleaned = orig.replace(/<\/?(br|p)\b.*?>/ig, '');
      if (!/[<>]/.test(cleaned)) best = cleaned;
      return best;
  };
  var replace = function(elem, replacer) {
    if ( /^math\d+$/.test(elem.id)
         || /script/i.test( elem.tagName ) ) return;
    if ( !mathRegExp2.test( elem.innerHTML ) ) return;
    if ( /pre|code/i.test( elem.tagName ) )
      return elem.innerHTML = elem.innerHTML.replace(/([\$\\])/g, escHTML);
    
    for ( var child = elem.firstChild; child; child = child.nextSibling )
      if ( child.tagName ) replace( child, replacer );

    var newHtml = elem.innerHTML.replace( mathRegExp, window.mathCleaner );
    if ( elem.innerHTML != newHtml ) elem.innerHTML = newHtml;
    
    for ( var child = elem.firstChild; child; child = child.nextSibling )
      if ( child.nodeType == 3 && mathRegExp2.test( child.nodeValue ) ) {
        // simple case for "only children"
        if ( child == elem.firstChild && !child.nextSibling ) {
          elem.innerHTML = 
            elem.innerHTML.replace( mathRegExp, replacer || replacement );
          break;
        }
        var s = elem.insertBefore( document.createElement('span'), child );
        s.appendChild( child );
        child = s;
        child.innerHTML = 
          child.innerHTML.replace( mathRegExp, replacer || replacement );
      }
  }
  window.reportMathError = function(e) {
	(new Image()).src = 'http://s3.amazonaws.com/replacemath/error?url=' + esc(window.location) + '&ua=' + esc(navigator.userAgent);
  }
  window.execReplaceMath = function(elem, replacer) {
      try {
		replace(elem, replacer)
	  } catch(e) {
	    reportMathError(e)
	  }
      // SVG if available
      var cbinfo = (
          haveSVG ? 
          'svgcb=onSVGResponse' : 
          'cb=onURLResponse' + ((dataImg && dataImg.width==1) ? '&data=1' : '')
      );
      try {
        sendMathRequests(cbinfo);
	  } catch(e) {
	    reportMathError(e)
	  }
  }
  window.replaceMath = function(elem, replacer) {
      // Fix some pages that include the script many times
      if ( window.$ && $.ready && elem === document.body ) {
        if ( window.mathReplacementScheduled ) return;
        window.mathReplacementScheduled = true;
        $(function() { execReplaceMath(elem, replacer) });
      }
      else {
        execReplaceMath(elem, replacer);
      }
  }
})();
