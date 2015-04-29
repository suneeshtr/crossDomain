// for Firefox extension
// See: https://mixmax.com/blog/gmail-just-broke-every-chrome-extension

var hosts = "https://*.example.com";
var iframeHosts = "https://*.example.com";

const {Cc, Ci, Cu} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
var HTTP_ON_MODIFY_REQUEST = "http-on-modify-request";
var HTTP_ON_EXAMINE_RESPONSE = "http-on-examine-response";

observerService.addObserver(
  function(subject, topic, data) {
      if (topic !== HTTP_ON_EXAMINE_RESPONSE) {
          return;
      }

      var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      var headerToModify;

      // Locate the CSP header, if any.
      // Don't modify it yet, though, since Firefox API docs say:
      // "Warning: Calling setResponseHeader() while visiting response
      // headers has undefined behavior. Don't do it!"
      httpChannel.visitResponseHeaders(function(header, value) {
          if (/content-security-policy/i.test(header)) {
              headerToModify = {
                  name: header,
                  value: value
              };
          }
      });

      // If we found a CSP, modify it.
      if (headerToModify) {
          var csp = headerToModify.value;
          csp = csp.replace('script-src', 'script-src ' + hosts);
          csp = csp.replace('style-src', 'style-src ' + hosts);
          csp = csp.replace('frame-src', 'frame-src ' + iframeHosts);
          httpChannel.setResponseHeader(headerToModify.name, csp, false);
      }
  },
  HTTP_ON_EXAMINE_RESPONSE,
  false
);


// for Chrome
 
chrome.webRequest.onHeadersReceived.addListener(function(details) {
  for (var i = 0; i < details.responseHeaders.length; i++) {
    var isCSPHeader = /content-security-policy/i.test(details.responseHeaders[i].name);
    if (isCSPHeader) {
      var csp = details.responseHeaders[i].value;
      csp = csp.replace('script-src', 'script-src ' + hosts);
      csp = csp.replace('style-src', 'style-src ' + hosts);
      csp = csp.replace('frame-src', 'frame-src ' + iframeHosts);
      details.responseHeaders[i].value = csp;
    }
  }
 
  return {
    responseHeaders: details.responseHeaders
  };
}, {
  urls: ['https://inbox.google.com/*','https://mail.google.com/*'],
  types: ['main_frame']
}, ['blocking', 'responseHeaders']);
