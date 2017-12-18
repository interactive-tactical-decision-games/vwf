import React from "react";
import { Table, Button } from "react-bootstrap";

import * as locals from "./locals";

export default function Reviews( props ) {
  return <Table striped>
    <thead>
      <Head/>
    </thead>
    <tbody>
      <Reviewws/>
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
    </th><th className="col-sm-3">
      Date
    </th><th className="col-sm-1">
      &nbsp;
    </th>
  </tr>;
}

function Reviewws( props ) {
  const records =
    locals.sessionScenarioSessions( locals.manifest[ "/ITDG/index.vwf" ] || [] );
  return <React.Fragment>
    { records.map( ( record, index ) => <Review key={ index } { ...record }/> ) }
  </React.Fragment>;
}

function Review( props ) {
  const scenario = props.scenario,
    session = props.session;
  return <tr>
    <td>
      { session.state.scenarioTitle }
    </td><td>
      { session.state.classroom.company }
    </td><td>
      { session.state.classroom.platoon }
    </td><td>
      { session.state.classroom.unit }
    </td><td>
      { locals.dateFormat( session.document.timestamp ) }
    </td><td>
      <Button href={ session.instance || session.document.uri } target="_blank" bsSize="small"> Review </Button>
    </td>
  </tr>;
}


// block review

//   //- Join each scenario with its sessions. Select only completed sessions (with documents).

//   -
//     var scenario_sessions =
//       locals.sessionScenarioSessions( locals.manifest[ "/ITDG/index.vwf" ] || [] );

//   table.table-striped.table#review
//     thead
//       tr
//         th.col-sm-5 Scenario
//         th.col-sm-1 Company
//         th.col-sm-1 Platoon
//         th.col-sm-1 Unit
//         th.col-sm-3 Date
//         th.col-sm-1 &nbsp;
//     tbody: each scenario_session in scenario_sessions
//       -
//         var scenario = scenario_session.scenario,
//           session = scenario_session.session;
//       tr
//         td.col-sm-5= session.state.scenarioTitle
//         td.col-sm-1= session.state.classroom.company
//         td.col-sm-1= session.state.classroom.platoon
//         td.col-sm-1= session.state.classroom.unit
//         td.col-sm-3= locals.dateFormat( session.document.timestamp )
//         td.col-sm-1: a.btn.btn-sm.review(href=session.instance||session.document.uri target="_blank") Review
