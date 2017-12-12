import React from "react";
import { Table, Form, FormControl, Button, ControlLabel } from "react-bootstrap";
import $ from "jquery";

import * as locals from "./locals";

export default function Scenarios( props ) {
  const scenario_sessions =
    locals.scenarioScenarioSessions( locals.manifest[ "/ITDG/index.vwf" ] || [] );
  return <Table striped>
    <thead>
      <Head/>
    </thead>
    <tbody>
      <Application/>
      { scenario_sessions.map( ( scenario_session, index ) =>
        <Scenario key={ index } scenario_session={ scenario_session }/> ) }
    </tbody>
  </Table>;
}

function Head( props ) {
  return <tr>
    <th className="col-sm-5">
      Scenario
    </th><th className="col-sm-1">
      Company
    </th><th className="col-sm-1">
      Platoon
    </th><th className="col-sm-1">
      Unit
    </th><th className="col-sm-2">
      &nbsp;
    </th><th className="col-sm-1">
      &nbsp;
    </th><th className="col-sm-1">
      &nbsp;
    </th>
  </tr>;
}

class Application extends React.Component {

  static TITLE_PLACEHOLDER = "New Scenario Title";
  static NAME_PLACEHOLDER = "Scenario Name";

  state = {
    title: ""
  };

  render() {
    return <tr>
      <Form onSubmit={ event => this.handleSubmit( event ) }>
      <td>
        <FormControl name="title" type="text" placeholder={ Application.TITLE_PLACEHOLDER } bsSize="small"
          value={ this.state.title } onChange={ event => this.handleTitle( event.target.value ) }/>
      </td><td colSpan="3">
        <FormControl name="name" type="text" placeholder={ Application.NAME_PLACEHOLDER } bsSize="small" className="hidden"
          value={ this.name() } />
      </td><td>
        &nbsp;
      </td><td>
        <Button type="submit" disabled={ !this.filled() } bsSize="small"> Create </Button>
      </td><td>
        <ControlLabel className="btn" bsSize="small">
          Import <FormControl type="file" accept=".zip" style={ { display: "none" } }/>
        </ControlLabel>
      </td>
      </Form>
    </tr>;
  }

  handleTitle( title ) {
    this.setState( { title } );
  }

  handleSubmit( event ) {
    let properties = {
      name: this.name(),
      title: this.state.title };
    $.post( "scenarios", properties ).
      done( function() { document.location.reload() } ).
      fail( function() {} );
    event.preventDefault();
  }

  name() {
    return this.state.title.trim().replace( /[^0-9A-Za-z]+/g, "-" );
  }

  filled() {
    return this.state.title.length > 0;
  }

}

class Scenario extends React.Component {

  static COMPANY_LENGTH = 8;
  static PLATOON_MIN = 1;
  static PLATOON_MAX = 9;
  static UNIT_MIN = 1;
  static UNIT_MAX = 9;

  state = {
    company: "",
    platoon: "",
    unit: "",
  };

  render() {
    const scenario = this.props.scenario_session.scenario,
      session = this.props.scenario_session.session;
    if ( !session ) {
      return <tr>
        <Form onSubmit={ event => this.handleSubmit( event ) }>
        <td>
          { scenario.state.scenarioTitle }
        </td><td>
          <FormControl name="company" type="text" maxLength={ Scenario.COMPANY_LENGTH } bsSize="small"
            value={ this.state.company } onChange={ event => this.handleCompany( event.target.value ) }/>
        </td><td>
          <FormControl name="platoon" type="number" min={ Scenario.PLATOON_MIN } max={ Scenario.PLATOON_MAX } step="1" bsSize="small"
            value={ this.state.platoon } onChange={ event => this.handlePlatoon( event.target.value ) }/>
        </td><td>
          <FormControl name="unit" type="number" min={ Scenario.UNIT_MIN } max={ Scenario.UNIT_MAX } step="1" bsSize="small"
            value={ this.state.unit } onChange={ event => this.handleUnit( event.target.value ) }/>
        </td><td>
          <FormControl name="name" type="hidden" value={ scenario.state.scenarioName }/>
        </td><td>
          <Button href={ scenario.instance || scenario.document.uri } target="_blank" bsSize="small" className={ this.filled() && "hidden" }> Edit </Button>
          <Button type="submit" disabled={ !this.filled() } bsSize="small" className={ !this.filled() && "hidden" }> Start </Button>
        </td><td>
          <Button href={ "/export-scenarios?scenarioName=" + scenario.state.scenarioName } bsSize="small"> Export </Button>
        </td>
        </Form>
      </tr>;
    } else {
      return null;
    }
  }

  handleCompany( company ) {
    this.setState( { company } );
  }

  handlePlatoon( platoon ) {
    this.setState( { platoon } );
  }

  handleUnit( unit ) {
    this.setState( { unit } );
  }

  handleSubmit( event ) {
    const scenario = this.props.scenario_session.scenario,
      session = this.props.scenario_session.session;
    let properties = {
      name: scenario.state.scenarioName,
      company: this.state.company,
      platoon: this.state.platoon,
      unit: this.state.unit };
    let newTab = window.open( "", "_blank" );
      newTab.document.write( "Loading..." );
    $.post( "sessions", properties ).
      done( function( response ) {
        newTab.location.href = response.document.uri + "/";
        document.location.reload() } ).
      fail( function() {} );
    event.preventDefault();
  }

  filled() {
    return this.state.company.length > 0 &&
      this.state.platoon.length > 0 &&
      this.state.unit.length > 0;
  }

}


// block scenarios

//   //- Left join each scenario with its sessions. Select only launchable scenarios (with documents)
//   //- and joinable sessions (with instances).

//   -
//     var scenario_sessions =
//       scenarioScenarioSessions( manifest[ "/ITDG/index.vwf" ] || [] );

//   table.table-striped.table#scenarios
//     thead
//       tr
//         th.col-sm-5 Scenario
//         th.col-sm-1 Company
//         th.col-sm-1 Platoon
//         th.col-sm-1 Unit
//         th.col-sm-2 &nbsp;
//         th.col-sm-1 &nbsp;
//         th.col-sm-1 &nbsp;
//     tbody
//       tr.application
//         form
//           td.col-sm-5.title: input.form-control.input-sm(name="title" type="text" placeholder="New Scenario Title")
//           td.col-sm-3.name(colspan=3): input.form-control.input-sm.hidden(name="name" type="text" placeholder="Scenario Name")
//           td.col-sm-2 &nbsp;
//           td.col-sm-1: button.btn.btn-sm.btn-default.create(type="submit" disabled) Create
//           td.col-sm-1: label.btn.btn-sm.btn-default.import Import
//             input(type="file" accept=".zip" style="display: none;")
//       each scenario_session in scenario_sessions
//         -
//           var scenario = scenario_session.scenario,
//             session = scenario_session.session;
//         unless session
//           tr.scenario
//             form
//               td.col-sm-5= scenario.state.scenarioTitle
//               td.col-sm-1.company: input.form-control.input-sm(name="company" type="text" maxlength="8")
//               td.col-sm-1.platoon: input.form-control.input-sm(name="platoon" type="number" min="1" max="9" step="1")
//               td.col-sm-1.unit: input.form-control.input-sm(name="unit" type="number" min="1" max="9" step="1")
//               td.col-sm-2.name: input(name="name" type="hidden" value=scenario.state.scenarioName)
//               td.col-sm-1
//                 a.btn.btn-sm.edit(href=scenario.instance||scenario.document.uri target="_blank") Edit
//                 button.btn.btn-sm.create.hidden(type="submit" disabled) Start
//               td.col-sm-1
//                 a.btn.btn-sm.export(href="/export-scenarios?scenarioName=" + scenario.state.scenarioName) Export
//     script.
//       document.addEventListener( "DOMContentLoaded", function() {
//         $( "table#scenarios" ).on( "input", "tr.scenario", function() {
//           var this$ = $( this ), filled = this$.find( ".company input" ).val() &&
//             this$.find( ".platoon input" ).val() &&
//             this$.find( ".unit input" ).val();
//           if ( filled ) {
//             this$.find( ".btn.edit" ).addClass( "hidden" );
//             this$.find( ".btn.create" ).removeClass( "hidden" );
//             this$.find( ".btn.create" ).prop( "disabled", false );
//           } else {
//             this$.find( ".btn.edit" ).removeClass( "hidden" );
//             this$.find( ".btn.create" ).addClass( "hidden" );
//             this$.find( ".btn.create" ).prop( "disabled", true );
//           }
//         } );
//         $( "table#scenarios" ).on( "submit", "tr.scenario form", function() {
//           // Extract properties to send with the post request
//           var row$ = $( this ).parents( "tr.scenario" );
//           var properties = {
//                name: row$.find( ".name input" ).val(),
//             company: row$.find( ".company input" ).val(),
//             platoon: row$.find( ".platoon input" ).val(),
//                unit: row$.find( ".unit input" ).val(),
//           };

//           // Create a redirection for which we will fill in the details later
//           var newTab = window.open( "", "_blank" );
//           newTab.document.write( "Loading..." );

//           $.post( "sessions", properties ).
//             done( function( response ) {
//               newTab.location.href = response.document.uri + "/";
//               document.location.reload();
//             } ).
//             fail( function() {} );
//           return false;
//         } );
//         $( "table#scenarios" ).on( "input", "tr.application", function() {
//           var this$ = $( this ),
//             filled = this$.find( ".title input" ).val();
//           if ( filled ) {
//             this$.find( ".btn.create" ).prop( "disabled", false );
//             this$.find( ".name input" ).val( this$.find( ".title input" ).val().trim().replace( /[^0-9A-Za-z]+/g, "-" ) );
//           } else {
//             this$.find( ".btn.create" ).prop( "disabled", true );
//           }
//         } );
//         $( "table#scenarios" ).on( "submit", "tr.application form", function() {
//           var row$ = $( this ).parents( "tr.application" ), properties = {
//              name: row$.find( ".name input" ).val(),
//             title: row$.find( ".title input" ).val(),
//           };
//           $.post( "scenarios", properties ).
//             done( function() { document.location.reload() } ).
//             fail( function() {} );
//           return false;
//         } );
//         $( ".import" ).change( function() {

//           var file = $( this ).find( "input" ).prop( "files" )[ 0 ];

//           // If the user canceled the file selector, do nothing
//           if ( !file ) {
//             return;
//           }

//           var formData = new FormData();
//           formData.append( "file", file );

//           $.ajax( {
//             url: "/import-scenarios",
//             type: "POST",
//             processData: false,
//             contentType: false,
//             data: formData,
//             success: function( data, textStatus, jqXHR ) {
//               location.reload();
//             },
//             error: function( jqXHR, textStatus, errorThrown ) {
//               var responseText = jqXHR.responseText || "Are you connected to the server?";
//               alert( "Uh oh ... we were unable to upload that file for import.\n" + responseText );
//             }
//           } );
//         } );
//       } );
