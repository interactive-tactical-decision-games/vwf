var path = require( 'path' ),
    http = require( 'http' ),
    https = require( 'https' ),
    fs = require( 'fs' ),
    url = require( 'url' ),
    sio = require( 'socket.io' ),
    reflector = require( './lib/nodejs/reflector' ),
    vwf = require( './lib/nodejs/vwf' ),
    argv = require('optimist').argv;


// Basic logging function.
global.log = function () {
    var args = Array.prototype.slice.call( arguments );
    var level = args.splice( args.length - 1 )[ 0 ];

    if ( !isNaN( parseInt( level ) ) ) {
        level = parseInt( level );
    } else {
        args.push( level )
        level = 1;
    };

    if ( level <= global.logLevel ) {
        console.log.apply( this, args );
    }
};

function consoleNotice( string ) {
    var brown = '\u001b[33m';
    var reset = '\u001b[0m';
    global.log( brown + string + reset );
}

function consoleError( string ) {
    var red   = '\u001b[31m';
    var reset = '\u001b[0m';
    global.log( red + string + reset );
}

// Set the root directory where applications will be served from. Default
// to the current directory if none is specified.
// Use --applicationPath or -a to specify an alternative path.
function parseApplicationPath () {

    if ( argv.applicationPath || argv.a ) {

        var applicationPath = argv.applicationPath || argv.a;

        if ( fs.existsSync( applicationPath ) && fs.statSync( applicationPath ).isDirectory() ) {
            consoleNotice( "Serving VWF applications from " + applicationPath );
            return applicationPath;
        } else {
            consoleError( applicationPath + " is NOT a directory! Serving VWF applications from " + process.cwd() );
            return process.cwd();
        }

    } else {
        consoleNotice( "Serving VWF applications from " + process.cwd() );
        return process.cwd();
    }
}

// Set the VWF directory where VWF files will be served from. Default to
// user specified directory if defined by the command line "-v" or "--vwfPath"
// options, then current working directory, and finally if not found at either,
// try the "$HOME/.vwf" directory.
function parseVWFPath () {
    var home = ( process.env.HOME || process.env.USERPROFILE );
    var vwfHome = path.join( home, ".vwf" );
    var vwfPath = ( argv.v  || argv.vwfPath );
     
    if ( vwfPath != undefined && fs.existsSync( path.join( vwfPath, "support/client/lib" ) ) ) {
        return vwfPath;
    } else if ( fs.existsSync( path.join( process.cwd(), "support/client/lib" ) ) ) {
        return process.cwd();
    } else if ( fs.existsSync( path.join( vwfHome, "support/client/lib" ) ) ) {
        return vwfHome;
    } else if ( process.env.VWF_DIR && fs.existsSync( path.join( process.env.VWF_DIR, "support/client/lib" ) ) ) {
        return process.env.VWF_DIR;
    } else {
        consoleError( "Could not find VWF support files." );
        return false;
    }
}


//Start the VWF server
function startVWF() {

    global.logLevel = ( ( argv.l || argv.log ) ? ( argv.l || argv.log ) : 1 );

    global.vwfRoot = parseVWFPath();

    global.instances = {};

    if ( !global.vwfRoot ) {
        // Should not hit this path since the VWF script checks for the existence
        // of the VWF support files before running this script.
        consoleError("Exiting.");
        process.exit();
    }

    function OnRequest( request, response ) {
        try {
            vwf.Serve( request, response );
        } catch ( e ) {
            response.writeHead( 500, {
                "Content-Type": "text/plain"
            } );
            response.write( e.toString(), "utf8" );
            response.end();
        }
    } // close onRequest

    consoleNotice( 'LogLevel = ' +  global.logLevel );  

    consoleNotice( 'Serving VWF support files from ' + global.vwfRoot );

    if ( argv.nocache ) {
        FileCache.enabled = false;
        consoleNotice( 'server cache disabled' );
    }

    global.applicationRoot = parseApplicationPath( );

    var ssl = ( argv.s  || argv.ssl );
    var sslOptions = {
        key: ( ( argv.k || argv.key ) ? fs.readFileSync( argv.k || argv.key ) : undefined ),
        cert: ( ( argv.c || argv.cert ) ? fs.readFileSync( argv.c || argv.cert ) : undefined )
    };

    //create the server
    var port = ( ( argv.p || argv.port ) ? ( argv.p || argv.port ) : 3000 );

    var srv = ssl ? https.createServer( sslOptions, OnRequest ).listen( port ) : http.createServer( OnRequest ).listen( port );
    consoleNotice( 'Serving on port ' + port );

    //create socket server
    var socketManager = sio.listen( srv, { 
        log: true,
        'log level': 3,
        resource: {
            exec: function( url ) {
                var match = /\/1\/\?t=\d*/.exec( url ) || /\/1\/websocket/.exec( url );
                if (match) {
                    return [url.substring(0, url.indexOf(match[0]))];
                } else {
                    return null;
                }
            }
        },
        'destroy buffer size': Infinity, // https://github.com/socketio/socket.io/issues/1592#issuecomment-45885463; should be fixed in socket.io 1.0
    } );
    socketManager.set( 'transports', [ 'websocket' ] );
    socketManager.set( 'heartbeat timeout', 600 );
    socketManager.set( 'close timeout', 60 );
    socketManager.sockets.on( 'connection', reflector.OnConnection );
}

exports.startVWF = startVWF;





const util = require('util');

// Report socket.io connection status to the console.

global.report_sio = function() {
  Object.keys( instances ).forEach( iid => {
    let instance = instances[ iid ],
      cid = Object.keys( instance.clients )[ 0 ],
      client = instance.clients[ cid ],
      manager = client.manager;
    let ids = new Set( [
      ... Object.keys( manager.sockets.sockets ), ... Object.keys( manager.connected ), ... Object.keys( manager.handshaken ),
      ... Object.keys( manager.open ), ... Object.keys( manager.closed ) ] );
    let table = Array.from( ids ).map( id => ( {
      id: id,
      ua: manager.sockets.sockets[ id ].handshake.headers[ "user-agent" ],
      connected: !! manager.connected[ id ],
      handshaken: !! manager.handshaken[ id ],
      open: manager.open[ id ],
      closed: manager.closed[ id ] && manager.closed[ id ].length } ) );
    console.log( "Instance", iid );
    console.table( table );
  } );
}

// Reset (forcefully close) the TCP socket associated with a socket.io transport.

global.destroy_sio = function( tid ) {
  Object.keys( instances ).forEach( iid => {
    let instance = instances[ iid ],
      cid = Object.keys( instance.clients )[ 0 ],
      client = instance.clients[ cid ],
      manager = client.manager,
      transport = manager.transports[ tid ];
    console.log( "destroy", tid );
    transport.socket._destroy( util._errnoException( -4077, 'read' ) );
    report_sio();
  } );
}

// Reset (forcefully close) the TCP socket associated with the given transport if the id matches the
// global `throw_sio.tid`.

global.throw_sio = function( tid ) {
  if ( tid === global.throw_sio.tid ) {
    console.log( "throw", tid );
    global.destroy_sio( tid );
  }
}

global.throw_sio.tid = null;

// Return the TCP socket associated with a socket.io transport.

global.socket_sio = function( tid ) {
  let socket;
  Object.keys( instances ).forEach( iid => {
    let instance = instances[ iid ],
      cid = Object.keys( instance.clients )[ 0 ],
      client = instance.clients[ cid ],
      manager = client.manager,
      transport = manager.transports[ tid ];
      socket = transport.socket;
  } );
  return socket;
}
