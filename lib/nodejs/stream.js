var path = require( 'path' ),
    mime = require( 'mime' ),
    fs = require( 'fs' ),
    helpers = require( './helpers' ),
    util = require('util'),
    formidable = require('formidable'),
    os = require('os'),
    parseurl = require( './parse-url' );
var streamStr = 'stream', uploadStr = 'upload';


var worker;
var sampleImageData;
var sampleVideoData;
var outputElement;
var filesElement;
var running = false;
var isWorkerLoaded = false;
var isSupported = (function() {
  return document.querySelector && window.URL && window.Worker;
})();

function isReady() {
  return !running && isWorkerLoaded && sampleImageData && sampleVideoData;
}

function startRunning() {
  running = true;
}
function stopRunning() {
  running = false;
}


function initWorker() {
  worker = new Worker("worker-asm.js");
  worker.onmessage = function (event) {
    var message = event.data;
    if (message.type == "ready") {
      isWorkerLoaded = true;
      worker.postMessage({
        type: "command",
        arguments: ["-help"]
      });
    } else if (message.type == "stdout") {
        console.log(message.data);
      //outputElement.textContent += message.data + "\n";
    } else if (message.type == "start") {
        console.log(message.data);
      //outputElement.textContent = "Worker has received command\n";
    } else if (message.type == "done") {
      stopRunning();
      var buffers = message.data;
      if (buffers.length) {
        outputElement.className = "closed";
      }
      //TODO: Write file to output directory
      buffers.forEach(function(file) {
        filesElement.appendChild(getDownloadLink(file.data, file.name));
      });
    }
  };
}


function OnStreamRequest( request, response, parsedRequest, segments ) {
    if ( request.url !== '' && segments.length > 1 ) {
        var file = path.join(__dirname, '../..');
        for (var i = 1; i < segments.length; i++) {
            file = path.join( file, segments[i] );
        }
        var m = mime.lookup( file );
        if ( m.substring( 0, 5 ) ===  "image" ) {
            var img = fs.readFileSync(file);
            response.writeHead(200, {'Content-Type': m });
            response.end(img, 'binary');
        } else {
            var range = request.headers.range || "bytes=0-";
            if ( range ) {
                var positions = range.replace(/bytes=/, "").split("-");
                var start = parseInt(positions[0], 10);
                fs.stat( file, function( err, stats ) {
                    if ( stats ) {
                        var total = stats.size;
                        var end = positions[1] ? parseInt( positions[1], 10 ) : total - 1;
                        var chunksize = (end - start) + 1;

                        response.writeHead( 206, {
                            "Content-Range": "bytes " + start + "-" + end + "/" + total,
                            "Accept-Ranges": "bytes",
                            "Content-Length": chunksize,
                            "Content-Type": m
                        });

                        var stream = fs.createReadStream( file, { start: start, end: end } )
                        .on( "open", function() {
                            stream.pipe( response );
                        }).on( "error", function( error ) {
                            response.end( error );
                        });
                    }
                });
            }
        }
    } else {
        response.end('');
    }
} //close OnStreamRequest


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

            var match = /([^.;+_]+)$/.exec(filename),
            filetype = match && match[1];

            var newName = filename;
            if ( filetype != 'wmv' ) {
                newName.replace(/\.[^/.]+$/, ".wmv");
                streamPath = helpers.JoinPath(streamStr, 'documents', relPath, newName);
            }
            
        });
        // parse the file and then send response
        form.parse(request, function(err, fields, files) {
            if ( ! err ) {
                if ( files[0] ) {
                   var videoData = new Uint8Array(files[0]);
                   runCommand('-i '+file.path+' -vf showinfo -strict -2 '+newName+'', filename, videoData);
                   response.writeHead(200, {'content-type': 'text/plain'});
                   response.end(streamPath);
                }
            } else {
                console.log("Error parsing file: " + err);
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

//Parse arguments of the conversion command
function parseArguments( text ) {
  text = text.replace(/\s+/g, ' ');
  var args = [];
  // Allow double quotes to not split args.
  text.split('"').forEach(function(t, i) {
    t = t.trim();
    if ((i % 2) === 1) {
      args.push(t);
    } else {
      args = args.concat(t.split(" "));
    }
  });
  return args;
}


//Run a conversion command
function runCommand(text, name, data) {
  if (isReady()) {
    startRunning();
    var args = parseArguments(text);
    console.log(args);
    worker.postMessage({
      type: "command",
      arguments: args,
      files: [
        {
          "name": name,
          "data": data
        }
      ]
    });
  }
}

//Start the conversion worker
initWorker();

// The Serve function takes the nodeJS request, nodeJS response and the parsedRequest, and
// attempts to see if it is a properly formed stream related request.
function Serve( request, response, parsedRequest ) {
    if ( parsedRequest[ 'private_path' ] ) {
        var segments = helpers.GenerateSegments( parsedRequest[ 'private_path' ] );
        if ( segments.length > 0 ) {
            switch ( segments[ 0 ] ) {
                case uploadStr:
                    if ( request.method == "POST" ) {
                        var result = HandlePersistenceUpload( request, response, parsedRequest, segments );
                        return result;
                     }
                     return false;
                case streamStr:
                    if ( request.method == "GET" ) {
                        OnStreamRequest( request, response, parsedRequest, segments );
                        return true;
                    }
                    return false;
            }
        }
    }
    return false;
}
exports.Serve = Serve;