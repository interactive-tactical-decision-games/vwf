"use strict";

const path = require( "path" ),
  ExtractText = require( "extract-text-webpack-plugin" );

module.exports = {
  context:
    path.resolve( __dirname ),
  entry:
    [ "./index.js", "./index.css" ],
  output: {
    path: path.resolve( __dirname ),
    filename: "bundle.js",
  },
  devtool:
    "source-map",
  module: {
    rules: [ {
      test:
        /\.js$/,
      exclude:
        /node_modules/,
      loader:
        "babel-loader",
      options: {
        presets: [ "env" ],
      },
    }, {
      test:
        /\.css$/,
      use:
        ExtractText.extract( { fallback: "style-loader", use: "css-loader" } ),
    } ]
  },
  plugins: [
    new ExtractText( { filename: "bundle.css" } ),
  ]
};
