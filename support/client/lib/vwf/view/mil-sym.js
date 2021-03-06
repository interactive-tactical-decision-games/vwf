// Copyright 2012 United States Government, as represented by the Secretary of Defense, Under
// Secretary of Defense (Personnel & Readiness).
// 
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
// 
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.

/// @module vwf/view/test
/// @requires vwf/view

define( [ "module", "vwf/view", "mil-sym/cws", "jquery" ], function( module, view, cws, $ ) {

    var self;
    var eventHandlers = {};
    var _rendererReady = false;
    var _graphicFormats = { "KML": 0,
                            "GeoJSON": 2,
                            "GeoCanvas": 3,
                            "GeoSVG": 6};
    
    return view.load( module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------

        initialize: function( options ) {
            
            self = this;

            this.arguments = Array.prototype.slice.call( arguments );

            if ( options === undefined ) { options = {}; }

            if ( this.state === undefined ) {   
                this.state = {};
            }
            if ( this.state.nodes === undefined ) {   
                this.state.nodes = {};
            }

            var rs = armyc2.c2sd.renderer.utilities.RendererSettings;

            //rs.setSymbologyStandard( rs.Symbology_2525Bch2_USAS_13_14 );  
            rs.setSymbologyStandard( rs.Symbology_2525C ); 
            rs.setTextOutlineWidth( 1 );

            pollForFontsLoaded();
        },

        // createdNode: function( nodeID, childID, childExtendsID, childImplementsIDs,
        //     childSource, childType, childIndex, childName, callback /* ( ready ) */) {
            
        // },

        // initializedNode: function( nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName  ) {

        // },
 
 
        // -- deletedNode ------------------------------------------------------------------------------

        // deletedNode: function( childID ) { },

        // -- addedChild -------------------------------------------------------------------------------

        //addedChild: function( nodeID, childID, childName ) { },

        // -- removedChild -----------------------------------------------------------------------------

        //removedChild: function( nodeID, childID ) { },

        // -- createdProperty --------------------------------------------------------------------------

        // createdProperty: function (nodeID, propertyName, propertyValue) {
        //     this.satProperty(nodeID, propertyName, propertyValue);
        // },

        // -- initializedProperty ----------------------------------------------------------------------

        // initializedProperty: function ( nodeID, propertyName, propertyValue ) { 
        //     this.satProperty(nodeID, propertyName, propertyValue);
        // },

        // TODO: deletedProperty

        // -- satProperty ------------------------------------------------------------------------------

        // satProperty: function ( nodeID, propertyName, propertyValue ) { 
        // },

        // -- gotProperty ------------------------------------------------------------------------------

        // gotProperty: function ( nodeID, propertyName, propertyValue ) { 
        // },

        // -- calledMethod -----------------------------------------------------------------------------

        // calledMethod: function( nodeID, methodName, methodParameters, methodValue ) {
        // },

        // -- firedEvent -----------------------------------------------------------------------------

        // firedEvent: function( nodeID, eventName, eventParameters ) {
        // },

        // -- ticked -----------------------------------------------------------------------------------

        // ticked: function() {
        // },

        renderUnitSymbol: renderUnitSymbol,
        rendererReady: rendererReady,
        addInsertableUnits: addInsertableUnits,
        getUpdatedUnitSymbolID: getUpdatedUnitSymbolID,
        getMissionGraphicDefinition: getMissionGraphicDefinition,
        renderMissionGraphic: renderMissionGraphic,
        getDefaultSymbolFillColor: getDefaultSymbolFillColor,
        getUnitImage: getUnitImage,
        symbolIsUnit: symbolIsUnit,
        getValidModifiers: getValidModifiers,
        isMilStd2525Symbol: isMilStd2525Symbol,

        on: function( eventName, callback ) {
            eventHandlers[ eventName ] = callback;
        }
    } );

    function addInsertableUnits( units ) {
        var foundUnits = undefined;
        var unit = undefined;
        var fullName = undefined;
        var actualName = undefined;
        var searchAcronym = undefined;
        var searchName = undefined;
        var unitsToAdd = undefined;
        var image = undefined;
        var appID = self.kernel.application();
        var description = undefined;
        var unitDef;

        if ( cws ) {

            // units must be an object with battleDivision members that are defined in cws
            // ex. ground, sea, air, subsurface, space

            for ( var battleDivision in units ) {
                
                unitsToAdd = units[ battleDivision ];
                if ( ! ( unitsToAdd instanceof Array ) ) {
                    unitsToAdd = [ unitsToAdd ];
                }
                // unitsToAdd is now an array of acronyms from cws.defs
                // a series of acronyms make up the 'fullNames' of the units separated by '.'
                // those fullNames also kind of describe the hierarchy of the objects definition               

                for ( var i = 0; i < unitsToAdd.length; i++ ) {

                    searchAcronym = unitsToAdd[ i ];
                    searchName = cws.decode( searchAcronym );

                    // searchAcronym is a single acronym defined in CWS
                    // findAll will search through all of the fullNames 
                    // for this 'battleDivision' and return an array of those units

                    foundUnits = cws.findAll( battleDivision, searchAcronym );
                    if ( foundUnits ) {

                        // loop through the array and send out an event 
                        // so the application can present the user
                        // with options to add these units to the application instance

                        for ( fullName in foundUnits ) {
                            
                            unit = foundUnits[ fullName ];

                            // render all of the affiliations, so that the UI doesn't
                            // have to request them on an as needed basis
                            image = {
                                "unknown": getUnitImage( cws.unknown( unit.symbolID ) ),
                                "friendly": getUnitImage( cws.friendly( unit.symbolID ) ),
                                "neutral": getUnitImage( cws.neutral( unit.symbolID ) ),
                                "hostile": getUnitImage( cws.hostile( unit.symbolID ) )
                            };

                            description = cws.description( fullName, unit.tag );
                            actualName = cws.descriptionFromSymbolId( unit.symbolID ) || cws.decode( cws.postTag( fullName, unit.tag ) ).replace( ".", " " );

                            unitDef = {
                                "fullName": fullName,
                                "actualName": actualName,
                                "searchAcronym": searchAcronym,
                                "searchName": searchName,
                                "description": description,
                                "tag": unit.tag,
                                "symbolID": unit.symbolID,
                                "image": image,
                                "specialModifiers": unit.specialModifiers
                            };

                            fireViewEvent( "insertableUnitAdded", {
                                unit: unitDef
                            } );
                        }
                    } else {
                        self.logger.warnx( "Unable to find: " + unitsToAdd[ i ] + " in " + battleDivision );
                    }
                }
            }
            fireViewEvent( "unitLoadingComplete" );
        }    
    }

    function renderUnitSymbol( symbolID, affiliation, echelonID, modifierList, unit ) {
        
        if ( !cws ) {
            self.logger.errorx( "cws is undefined - unable to render unit icon" );
            return;
        }

        var updatedUnit = $.extend( true, {}, unit );
        var appID = self.kernel.application();
        var renderer = armyc2.c2sd.renderer;
        var msa = renderer.utilities.MilStdAttributes;
        var rs = renderer.utilities.RendererSettings;
        
        // Set affiliation in unit symbol id
        updatedUnit.symbolID = cws.addAffiliationToSymbolId( symbolID, affiliation );
        
        // Add echelon
        if ( echelonID != undefined ) {          
            updatedUnit.symbolID = cws.addEchelonToSymbolId( updatedUnit.symbolID, echelonID );
        }
        
        // Gather the modifiers that will be passed into the render function
        var modifiers = {};
        modifiers[ msa.PixelSize ] = "60"; // default
        for ( var prop in modifierList ) {
            if (modifierList[prop] != undefined) {
                switch ( prop.toLowerCase() ) {
                    case "pixelsize":
                        modifiers[ msa.PixelSize ] = modifierList[ prop ];
                        break;
                    case "linecolor": 
                        modifiers[ msa.LineColor ] = modifierList[ prop ];
                        break;
                    case "fillcolor": 
                        modifiers[ msa.FillColor ] = modifierList[ prop ];
                        break;
                    case "iconcolor":
                        modifiers[ msa.IconColor ] = modifierList[ prop ];
                        break;
                    case "icon":
                        // We ignore this value - it must be "false" or we'll get no modifiers
                        break;
                    default:
                        modifiers[ prop ] = modifierList[ prop ];
                        break;
                }
            }
        }
        modifiers[ msa.Icon ] = false; // Override whatever value might have been passed in
        modifiers[ msa.SymbologyStandard ] = rs.Symbology_2525C;

        // Render the image
        var img = renderer.MilStdIconRenderer.Render( updatedUnit.symbolID, modifiers );
        if ( img ) {
            updatedUnit.image = updatedUnit.image || {};
            var imgBounds = img.getImageBounds();
            updatedUnit.image.selected = {
                "url": img.toDataUrl(),
                "width": imgBounds.width,
                "height": imgBounds.height,
                "center": img.getCenterPoint()
            }
        }

        return updatedUnit;
    }
    
    function getUpdatedUnitSymbolID( symbolID, affiliation, echelonID, status, mobility ) {

        if ( !cws ) {
            self.logger.errorx( "cws is undefined - unable to render unit icon" );
            return;
        }

        var updatedUnitSymbolID = symbolID;
        
        // Set affiliation in unit symbol id
        if ( !!affiliation ) {
            updatedUnitSymbolID = cws.addAffiliationToSymbolId( symbolID, affiliation );
        }
        
        // Add echelon
        if ( !!echelonID ) {          
            updatedUnitSymbolID = cws.addEchelonToSymbolId( updatedUnitSymbolID, echelonID );
        }

        // Add status
        if ( !!status ) {
            updatedUnitSymbolID = cws.addUnitStatusToSymbolId( updatedUnitSymbolID, status );
        }

        // Add mobility
        if ( !!mobility ) {
            updatedUnitSymbolID = cws.addMobilityToSymbolId( updatedUnitSymbolID, mobility );
        }

        return updatedUnitSymbolID;
    } 

    function getUnitImage( symbolID ) {
        var renderer = armyc2.c2sd.renderer;
        var msa = renderer.utilities.MilStdAttributes;
        var rs = renderer.utilities.RendererSettings;
        var modifiers = {};

        modifiers[ msa.PixelSize ] = 32;
        modifiers[ msa.Icon ] = true;
        modifiers[ msa.SymbologyStandard ] = rs.Symbology_2525C;
        
        var img = renderer.MilStdIconRenderer.Render( symbolID, modifiers );
        if ( img ) {
            return img.toDataUrl();
        } else {
            return "";
        }
    }

    function isMilStd2525Symbol( symbolID ) {
        var renderer = armyc2.c2sd.renderer;
        var msa = renderer.utilities.MilStdAttributes;
        var rs = renderer.utilities.RendererSettings;
        
        const basicSymbolID = renderer.utilities.SymbolUtilities.getBasicSymbolID( symbolID );
        const isUnit        = renderer.utilities.UnitDefTable.hasUnitDef( basicSymbolID, rs.Symbology_2525C );
        const isSymbol      = renderer.utilities.SymbolDefTable.hasSymbolDef( basicSymbolID, rs.Symbology_2525C );

        return ( isUnit || isSymbol );
    }

    function getValidModifiers( symbolID, specialModifiers ) {
        const renderer = armyc2.c2sd.renderer;
        const msa = renderer.utilities.MilStdAttributes;
        const rs = renderer.utilities.RendererSettings;
        var symUtil = renderer.utilities.SymbolUtilities;
        var validModifiers = [];

        // Define the list of valid modifiers
        validModifiers = [ "pixelSize", "iconcolor", "lineColor", "fillColor" ];
        var aliases = Object.keys( cws.aliasModifiers );
        for ( var i = 0; i < aliases.length; i++ ) {

            var alias = aliases[ i ];
            var modObj = cws.aliasModifiers[ alias ];
            
            var modifier = renderer.utilities.ModifiersUnits[ modObj.modifier ];
            // Query mil-sym to see if this symbol has this modifier
            if ( symUtil.hasModifier( symbolID, 
                                      modifier,
                                      rs.getSymbologyStandard() ) ) {
                // Add to the array of valid modifiers
                validModifiers.push( alias );
            }
        }

        // If there is a special modifier defined for this symbol, 
        // add it as a valid modifier
        if ( specialModifiers ) {
            for ( var j = 0; j < ( specialModifiers || [] ).length; j++ ) {
                validModifiers.push( specialModifiers[ j ] );
            }
        }

        return validModifiers;
    }

    function renderMissionGraphic( symbolID, affiliation, modifiers, controlPoints, bounds, latLonBoundBox, format ) {
        
        if ( !cws ) {
            self.logger.errorx( "cws is undefined - unable to render unit icon" );
            return;
        }

        var rendererMP = sec.web.renderer.SECWebRenderer;
        var scale = 100.0;
        var appID = self.kernel.application();
        var renderer = armyc2.c2sd.renderer;
        var msa = renderer.utilities.MilStdAttributes;
        var rs = renderer.utilities.RendererSettings;
        var symUtil = renderer.utilities.SymbolUtilities;
        var milSymControlPts = convertXYVertexArrayToMilSymControlPts( controlPoints );
        
        // Set affiliation in symbol id
        symbolCode = cws.addAffiliationToSymbolId( symbolID, affiliation );
        
        // Convert modifiers to actual names and types
        var actualNameModifiers = {};
        for ( mod in modifiers ) {
            var modObj = cws.modifierByAlias( mod );
            var modActualName =  self.state.getModifierActualName( modObj );
            actualNameModifiers[ modActualName ] = self.state.convertModifierValue( modObj, modifiers[ mod ] );
        }

        var img = rendererMP.RenderSymbol2D( "ID", "Name", "Description", symbolCode, milSymControlPts, bounds[0], bounds[1], latLonBoundBox, actualNameModifiers, format );

        return img;
    }

    // Take an array [x1,y1,xy,y2,...xn,yn] and convert to 
    // mil-sym control point string "x1,y1 x2,y2 ... xn,yn"
    function convertXYVertexArrayToMilSymControlPts( xyVertexPts ) {
        var milSymControlPts = "";
        // xyVertexPts is an array where even numbered elements are x and odd are y
        // mil-sym style is a string where pairs of x and y are separated by spaces
        for ( var i = 0; i < xyVertexPts.length; i=i+2 ) {
            milSymControlPts = milSymControlPts + xyVertexPts[i] + "," + xyVertexPts[i+1];
            if ( i < xyVertexPts.length-2 ) {
                milSymControlPts = milSymControlPts + " ";
            }
        }

        return milSymControlPts;
    }

    function getMissionGraphicDefinition( category, fullName ) {
        var missionGraphicDef = {};

        if ( !cws ) {
            self.logger.errorx( "cws is undefined - unable to retrieve object" );
            return;
        }

        if ( !!category && !!cws[category] ) {
            if ( !!fullName && !!cws[category][fullName] ) {
                missionGraphicDef = cws[category][fullName];
            } else {
                missionGraphicDef = cws[category];
            }
        }

        return missionGraphicDef;
    }

    function fireViewEvent( eventName, parameters ) {
        var eventHandler = eventHandlers[ eventName ];
        if ( typeof eventHandler === "function" ) {
            eventHandler( parameters );
        }
    }

    function pollForFontsLoaded() {
        if ( armyc2.c2sd.renderer.utilities.RendererUtilities.fontsLoaded() ) {
            _rendererReady = true;
            fireViewEvent( "milSymRendererReady" );
        } else {
            setTimeout( pollForFontsLoaded, 500 );
        }
    }

    function rendererReady() {
        return _rendererReady;
    }

    function getDefaultSymbolFillColor( symbolID, affiliation ) {
          var color = '000000';                  

          /* TODO: handle different color sets depending upon symbol type */

          var colors = { friendly: '80E0FF',
                         hostile:  'FF8080',
                         neutral:  'AAFFAA',
                         unknown:  'FFFF80' };
          color = colors[ affiliation ];

          return color;
    }

    function symbolIsUnit( symbolID ) {
        return ( armyc2.c2sd.renderer.utilities.SymbolUtilities.isUnit( symbolID ) );
    }

} );
