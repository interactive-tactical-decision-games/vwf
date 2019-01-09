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
    url = require('url');
var terrainStr = 'TerrainService', aStarStr = 'AstarAI', visibilityStr = "VisibilityService", observerStr = "ObserverService", overlayStr = "OverlayService", ipaddress = [];
var sandTablePort = 9057;
var requestQueue = [], currentRequest;
var requestCache = {}, cacheLimit = 20;

function OnVisibilityRequest( request, response, parsedRequest, segments, params ) {
    console.log( "In VisibilityRequest" );
    addToQueueAndCheckStatus( { request:request, response:response, parsedRequest:parsedRequest, segments:segments, params:params } );
    return true;
} //close OnVisibilityRequest

function OnAStarRequest( requestObj ) {
    console.log( "In ASTARRequest" );
    /*if ( requestObj.segments[ 1 ] === "PlanPath" ) {
        if ( requestCache[requestObj.request.url] != null )
        {
            shortcutRequest( requestObj, requestCache[requestObj.request.url] );
            return true;
        }
        requestObj.onData = function ( data ) {
            addToCache( requestObj.request.url, data );
        };
    }*/
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnAStarRequest

function OnTerrainRequest( requestObj ) {
    console.log( "In TerrainRequest" );
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnTerrainRequest

function OnObserverRequest( requestObj ) {
    console.log( "In ObserverRequest" );
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnObserverRequest

function OnOverlayRequest( requestObj ) {
    console.log( "In OnOverlayRequest" );
    if ( requestObj.segments[ 1 ] === "GenerateOverlay" ) {
        const urlID = requestObj.request.url;
        if ( requestCache[requestObj.request.url] != null )
        {
            shortcutRequest( requestObj, requestCache[ urlID ] );
            return true;
        }
        const currentTime = ( new Date() ).getTime();
        requestObj.params.requestID = currentTime;
        requestObj.request.query = JSON.stringify( requestObj.params );
        requestObj.request.url = "/OverlayService/GenerateOverlay/?params=" + requestObj.request.query;
        
        requestObj.onData = function ( data ) {
            const jsonData = JSON.parse( data );
            if ( jsonData.status === 1 ) {
                addToCache( urlID, data );
            }
        };
    }
    addToQueueAndCheckStatus( requestObj );
    return true;
} //close OnOverlayRequest

function addToQueueAndCheckStatus( requestObj ) {
    requestQueue.push( requestObj );
    processRequest();
}

function shortcutRequest( requestObj, responseData ) {
    requestObj.response.send( responseData );
}

function addToCache( url, data ) {
    if ( data != null) {
        // reduce size of requestCache to match cache Limit
        for ( let key in requestCache ) {
            if ( Object.keys( requestCache ).length < cacheLimit ) {
                break;
            }
            delete requestCache[ key ];
        }
        requestCache[url] = data.toString();
    }
}

function nextRequest() {
    currentRequest = null;
    processRequest();
}

function processRequest() {
    if ( requestQueue.length > 0 && currentRequest == null ) {
        if ( ipaddress.length <= 0 ) {
            Init();
        }

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
                    let dataToSave = JSON.parse(data);
                    if ( dataToSave && ( dataToSave.status === 0 || dataToSave.status === 2 ) ) { //READY
                        currentRequest = requestQueue.shift();
                        while( !currentRequest && requestQueue.length > 0 ) {
                            currentRequest = requestQueue.shift();
                        }
                        if ( currentRequest != null ) {
                            forwardRequestToSandTable( currentRequest );
                        }
                    }
                } catch ( e ) {
                    console.log( "error parsing json: " + e.message );
                }

            } );
        } ).on( "error", (err) => {
            console.log( "Error: " + err.message );
            // if no connection could be made, shift to the next ipaddress and try again
            if( ( err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT" ) && ipaddress[0] === err.ipaddress ){
                ipaddress.shift();
                // only try again if other ipaddresses are available to avoid inifite loop
                if ( ipaddress.length > 0 ) {
                    processRequest();
                }
            }
        } );
    }
}

function forwardRequestToSandTable( request ) {
    const req = request.request;
    const res = request.response;
    const parsedRequest = request.parsedRequest;
    const params = request.params;
    const onData = request.onData;
    if ( ipaddress.length <= 0 ) {
        Init();
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

    req.pause(); 

    var options = url.parse(reqUrl);
    options.headers = req.headers;
    options.method = req.method;
    options.agent = false;
    options.headers['host'] = options.host;
  
 
    var connector = (options.protocol == 'https:' ? https : http).request(options, function(serverResponse) { 
  
      serverResponse.pause(); 
  
      serverResponse.headers['access-control-allow-origin'] = '*'; 

      let data = [];
      serverResponse.on('data', chunk => {
        data.push(chunk)
      });
      serverResponse.on('end', () => {
        // save to server
        try {
            if ( onData != null ) {
                onData( data );
            }
        } catch ( e ) {
        }

      });
  
      switch (serverResponse.statusCode) { 
        // pass through.  we're not too smart here... 
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
      nextRequest();
    });
    connector.on('error', (e) => {
      // log the error
      console.error(`problem with request: ${e.message}`);
      nextRequest();
    });
    req.pipe(connector, {end:true});
    req.resume();
}

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


// use this to save to file system
function HandlePersistenceUpload( request, response, parsedRequest, segments ) {
    if ( segments.length >= 2 ) {
        var streamPath;
        var form = new formidable.IncomingForm();
        form.keepExtensions = true;
        // create the path in file system if not there
        var relPath = parsedRequest[ 'public_path' ];
        for (var i = 1; i < segments.length; i++) {
            var relPath = helpers.JoinPath( relPath, segments[i] );
        }
        CreateDirectory( relPath );
        form.on('fileBegin', function(name, file) {
            // redirect file to the specified path
            var filename = file.name.replace(/\s+/g, '_');
            file.path = helpers.JoinPath( './documents', relPath, filename);
            streamPath = helpers.JoinPath(streamStr, 'documents', relPath, filename);
        });
        // parse the file and then send response
        form.parse(request, function(err, fields, files) {
            if ( ! err ) {

                // If this is a .zip file, unzip it first
                if ( streamPath.endsWith( ".zip" ) ) {
                    var zip = new AdmZip( files.file.path );
                    zip.extractAllTo( helpers.JoinPath( './documents', relPath ) );
                    streamPath = streamPath.substring( 0, streamPath.indexOf( ".zip" ) );
                }
                response.writeHead(200, {'content-type': 'text/plain'});
                response.end(streamPath);
            } else {
                response.writeHead(500);
                response.end();
            }
        });
        return true;
    }
    return false;
} // close HandlePersistenceUpload

function CreateDirectory( relPath ) {
    var application_segments = helpers.GenerateSegments( relPath );
    var current_directory = "./documents";
    while ( application_segments.length > 0 ) {
        current_directory = helpers.JoinPath( current_directory, application_segments.shift() );
        if ( ! helpers.IsDirectory( current_directory ) ) {
            fs.mkdirSync( current_directory );
        }
    }
}


// The Serve function takes the nodeJS request, nodeJS response and the parsedRequest, and
// attempts to see if it is a properly formed stream related request.
function Serve( request, response, parsedRequest ) {
    if ( parsedRequest[ 'private_path' ] ) {
        const segments = helpers.GenerateSegments( parsedRequest[ 'private_path' ] );
        const params = parseURLParams( ( request.query || {} ).params );
        if ( segments.length > 0 ) {
            const newRequest = { request:request, response:response, parsedRequest:parsedRequest, segments:segments, params:params };
            switch ( segments[ 0 ] ) {
                case terrainStr:
                    if ( request.method == "POST" || request.method == "GET" ) {
                        var result = OnTerrainRequest( newRequest );
                        return result;
                     }
                     return false;
                case aStarStr:
                    if ( request.method == "POST" || request.method == "GET" ) {
                        var result = OnAStarRequest( newRequest );
                        return result;
                    }
                    return false;
                case visibilityStr:
                    if ( request.method == "POST" || request.method == "GET" ) {
                        var result = OnVisibilityRequest( newRequest );
                        return result;
                    }
                    return false;
                case observerStr:
                    if ( request.method == "POST" || request.method == "GET" ) {
                        var result = OnObserverRequest( newRequest );
                        return result;
                    }
                    return false;
                case overlayStr:
                    if ( request.method == "POST" || request.method == "GET" ) {
                        var result = OnOverlayRequest( newRequest );
                        return result;
                    }
                    return false;
            }
        }
    }
    return false;
}

function Init() {
    var ifaces = os.networkInterfaces();

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }
            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                //console.log(ifname + ':' + alias, iface.address);
            } else {
                // this interface has only one ipv4 adress
                //console.log(ifname, iface.address);
            }
            ipaddress.push( iface.address );
            ++alias;
        });
    });
}

exports.Serve = Serve;
exports.Init = Init;