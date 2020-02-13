var path = require( 'path' ),
    mime = require( 'mime' ),
    fs = require( 'fs' ),
    helpers = require( './helpers' ),
    util = require('util'),
    formidable = require('formidable'),
    os = require('os'),
    ifaces = os.networkInterfaces(),
    parseurl = require( './parse-url' ),
    AdmZip = require( 'adm-zip' ),
    http = require( 'http' ),
    https = require( 'https' ),
    fp = require('lodash/fp'),
    querystring = require('querystring'),
    url = require('url');
var routes = {
    'TerrainService': OnTerrainRequest,
    'AstarAI': OnAStarRequest,
    "VisibilityService": OnVisibilityRequest,
    "ObserverService": OnObserverRequest,
    "OverlayService": OnOverlayRequest,
    "RadioMapService": OnRadioMapRequest,
    "UnitVisibilityManager": OnUnitVisibilityRequest,
    "Virtualitics": OnVisibilityRequest,
};
var blockingCalls = [
    'GenerateOverlay',
    'UpdateQueryTools',
    'PlanPath',
    'LoadTerrain'
];
var ipaddress = [];
var sandTablePort = 9057;
var requestQueue = [], currentRequest;
var requestCache = [], cacheLimit = 20;

function OnVisibilityRequest( requestObj ) {
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnVisibilityRequest

function OnAStarRequest( requestObj ) {
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnAStarRequest

function OnTerrainRequest( requestObj ) {
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnTerrainRequest

function OnObserverRequest( requestObj ) {
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnObserverRequest

function OnRadioMapRequest( requestObj ) {
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnRadioMapRequest

function OnUnitVisibilityRequest( requestObj ) {
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnUnitVisibilityRequest

function OnOverlayRequest( requestObj ) {
	// If generateOVerlay, cache the request ID so we don't have to bog down the server
    if ( requestObj.segments[ 1 ] === "GenerateOverlay" ) {
        const params = extractParams(requestObj.request.url);
        const [isCached, value] = getFromCache(params);
        // if the request has been cached shortcut and return the cached requestID
        if ( isCached )
        {
            shortcutRequest( requestObj, value );
            return true;
        }

        // addTOCache once we receive a valid response
        requestObj.onData = function ( data ) {
            const jsonData = JSON.parse( data );
            if ( jsonData.status === 1 ) {
                addToCache( params, data );
            }
        };
    }
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnOverlayRequest

function addToQueueAndCheckStatus( requestObj ) {
    if ( blockingCalls.indexOf( requestObj.segments[1] ) >= 0 ) {
        requestQueue.push( requestObj );
        processRequest();
    } else {
        forwardRequestToSandTable( requestObj, true );
    }

}

// use the request to send the specified response data
function shortcutRequest( requestObj, responseData ) {
    requestObj.response.send( responseData );
}

function extractParams($url) {
    const { query } = url.parse($url, true);
    const params = JSON.parse(query.params);
    return fp.omit(['requestID'], params);
}

// add key/value to requestCache but reduce the size of the cache based on cacheLimit
function addToCache( params, data ) {
    if ( data != null) {
        // reduce size of requestCache to match cache Limit
        while (requestCache.length > cacheLimit) {
            requestCache.pop();
        }
        requestCache.push([params, data.toString()]);
    }
}

function getFromCache(params) {
    for (const [key, value] of requestCache) {
        if (fp.isEqual(key, params)) {
            return [true, value];
        }
    }
    return [false, null];
}

function clearRequestCache() {
    requestCache = [];
}

function clearRequestQueue() {
    requestQueue = []
    currentRequest = undefined;
}

// move to the next request by nulling out current request and forcing a processRequest
function nextRequest() {
    currentRequest = null;
    processRequest();
}


function processRequest() {
    if ( requestQueue.length > 0 && currentRequest == null ) {
    	// update ipaddress as needed
        if ( ipaddress.length <= 0 ) {
            initializeIPaddresses();
        }
        // return if no ipaddress is available
        if ( ipaddress.length <= 0 ) {
            return;
        }

        // Use Get Status to ensure that the server is ready prior to sending request
        var host = ipaddress[0] + ":" + sandTablePort;
        var reqUrl = "http://" + ipaddress[0] + ":" + sandTablePort + '/OverlayService/GetStatus/?params={}';


        const options = url.parse( reqUrl ); 
        const serverRequest = http.get( reqUrl, function( serverResponse ) {
            let data = [];
            serverResponse.on('data', chunk => {
                data.push(chunk)
            });
            serverResponse.on('end', () => {
                // save to server
                try {
                    let statusJSON = JSON.parse(data);
                    if ( statusJSON && ( statusJSON.status === 0 || statusJSON.status === 2 ) ) { //READY
                    	// shift to the next available request and try to forward to sandtable server
                    	//  (make sure the the request is not empty)
                        currentRequest = requestQueue.shift();
                        while( !currentRequest && requestQueue.length > 0 ) {
                            currentRequest = requestQueue.shift();
                        }
                        if ( currentRequest != null ) {
                            forwardRequestToSandTable( currentRequest );
                        }
                    }
                } catch ( e ) {
                    console.log( "error processing data: " + data + '\n error:' + e.message );
                }

            } );
        } ).on( "error", (err) => {
            console.log( "Error: " + err.message );
            // if no connection could be made, shift to the next ipaddress and try again
            if( ( err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT" ) && ipaddress[0] === err.address ){
                ipaddress.shift();
                // clear request cache since server is not accessible
                clearRequestCache();
                // only try again if other ipaddresses are available to avoid inifite loop
                //  otherwise, clear the requestQueue
                if ( ipaddress.length > 0 ) {
                    processRequest();
                } else {
                    clearRequestQueue();
                }
            }
        } );
    }
}

// send request to the sandtable server and return the response as required
function forwardRequestToSandTable( request, skipQueue = false ) {
    const req = request.request;
    const res = request.response;
    const parsedRequest = request.parsedRequest;
    const params = request.params;
    const onData = request.onData;
    if ( ipaddress.length <= 0 ) {
        initializeIPaddresses();
    }

    if ( ipaddress.length <= 0 ) {
        res.writeHeader(500, { 
          'content-type': 'text/plain' 
        }); 
        res.end(process.argv.join(' ') + ':\n\nError ' + serverResponse.statusCode + '\n' + stringifiedHeaders); 
        return;
    }

    // change request to match sandtable
    var newHost = ipaddress[0] + ":" + sandTablePort;
    var reqUrl = "http://" + newHost + req.url;
    var originalHost = req.headers.host;

    // pause the original request
    //  prevents flow of data back to requestor until resume is called
    //  (after we pipe the request to the SandTableServer)
    req.pause(); 

    // create options based on new url
    var options = url.parse(reqUrl);
    options.headers = req.headers;
    options.method = req.method;
    options.agent = false;
    options.headers['host'] = options.host;
  
 
 	// use connector to forward request to the server
    var connector = (options.protocol == 'https:' ? https : http).request(options, function(serverResponse) { 
  
      serverResponse.pause(); 
  
      serverResponse.headers['access-control-allow-origin'] = '*'; 

      let data = [];
      serverResponse.on('data', chunk => {
        data.push(chunk)
      });
      serverResponse.on('end', () => {
        // call onData here if specified
        try {
            if ( onData != null ) {
                onData( data );
            }
        } catch ( e ) {
        }

      });
  
      switch (serverResponse.statusCode) { 
        // pass through.... 
        case 200: case 201: case 202: case 203: case 204: case 205: case 206: 
        case 304: 
        case 400: case 401: case 402: case 403: case 404: case 405: 
        case 406: case 407: case 408: case 409: case 410: case 411: 
        case 412: case 413: case 414: case 415: case 416: case 417: case 418: 
          res.writeHeader(serverResponse.statusCode, serverResponse.headers); 
          serverResponse.pipe(res, {end:true}); 
          serverResponse.resume(); 
        break; 

        // fix host and pass through.   
        case 301: 
        case 302: 
        case 303: 
          serverResponse.statusCode = 303; 
          serverResponse.headers['location'] = originalHost +'/'+serverResponse.headers['location'];
          res.writeHeader(serverResponse.statusCode);
          serverResponse.pipe(res, {end:true}); 
          serverResponse.resume(); 
        break; 
  
 
        // error everything else 
        default: 
          var stringifiedHeaders = JSON.stringify(serverResponse.headers, null, 4); 
          serverResponse.resume(); 
          res.writeHeader(500);
          res.end(process.argv.join(' ') + ':\n\nError ' + serverResponse.statusCode + '\n' + stringifiedHeaders); 
        break;
      }
      // move on to the next request
      if ( skipQueue ) {
          nextRequest();
      }
    });
    // listen for any errors
    connector.on('error', (e) => {
      // log the error
      console.log(`error with request: ${e.message}`);
      if ( skipQueue ) {
          nextRequest();
      }
    });
    // pipe the connector and resume
    req.pipe(connector, {end:true});
    req.resume();
}

// return json object representing the params specified in the url
function parseURLParams( urlStr ) {
    let params = {};
    if ( urlStr != null ) {
        const parseStr = '?params=';
        let tokens = urlStr.split( parseStr );
        if ( tokens[ tokens.length - 1 ] ) {
            try {
                params = JSON.parse( tokens[ tokens.length - 1 ] );
            } catch ( e ) {
                params = {};
            }
        }
    }
    return params;
}


// The Serve function takes the nodeJS request, nodeJS response and the parsedRequest, and
// attempts to see if it is a properly formed stream related request.
function Serve( request, response, parsedRequest ) {
    if ( parsedRequest[ 'private_path' ] ) {
        const segments = helpers.GenerateSegments( parsedRequest[ 'private_path' ] );
        const params = parseURLParams( ( request.query || {} ).params );
        if ( segments.length > 0 ) {
        	// create request object and send through appropriate channel
            const newRequest = { request:request, response:response, parsedRequest:parsedRequest, segments:segments, params:params };
            if ( ( request.method == "POST" || request.method == "GET" ) &&
                routes[segments[0]] != null && typeof routes[segments[0]] === 'function' ) {
                var result = routes[segments[0]]( newRequest );
                return result;
            }
        }
    }
    return false;
}

function initializeIPaddresses() {
	const ifaces = os.networkInterfaces();

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }
            ipaddress.push( iface.address );
            ++alias;
        });
    });
}

/// INitialize anything needed for sandtable (i.e. ipaddresses)
function Init() {
	initializeIPaddresses();
}

function IsExempt( request, parsedRequest ) {
    const segments = helpers.GenerateSegments( parsedRequest[ 'private_path' ] );
    if ( request != null && ( request.method == "POST" || request.method == "GET" ) &&
        segments[0] != null &&
        routes[segments[0]] != null && typeof routes[segments[0]] === 'function' ) {
        return true;
    }
    return false;
}

exports.Serve = Serve;
exports.Init = Init;
exports.IsExempt = IsExempt;