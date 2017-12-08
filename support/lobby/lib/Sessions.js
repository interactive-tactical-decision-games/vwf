import React from "react";
import { Table, Button } from "react-bootstrap";

import * as locals from "./locals";

const user = { instructor: true };

export default function Sessions( props ) {
  const scenario_sessions =
    locals.scenarioScenarioSessions( locals.manifest[ "/ITDG/index.vwf" ] || [] );
  return <Table striped>
    <thead>
      <Head/>
    </thead>
    <tbody>
      { scenario_sessions.map( ( scenario_session, index ) =>
        <Session key={ index } scenario_session={ scenario_session }/> ) }
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
      &nbsp;
    </th><th className="col-sm-1">
      &nbsp;
    </th>
  </tr>;
}

function Session( props ) {
  const scenario = props.scenario_session.scenario,
    session = props.scenario_session.session;
  if ( session && ( session.instance || user.instructor ) ) {
    return <tr>
      <td>
        { session.state.scenarioTitle }
        <br/>
        <span className="small">{ locals.instructorStudentsLabel( session ) }</span>
      </td><td>
        { session.state.classroom.company }
      </td><td>
        { session.state.classroom.platoon }
      </td><td>
        { session.state.classroom.unit }
      </td><td>
        &nbsp;
      </td><td>
        <Button href={ session.instance || session.document.uri } target="_blank" bsSize="small">{ session.instance ? "Join" : "Start" }</Button>
      </td><td>
        &nbsp;
      </td>
    </tr>;
  } else {
    return null;
  }
}


// block sessions
//   -
//     var scenario_sessions = locals.scenarioScenarioSessions( locals.manifest[ "/ITDG/index.vwf" ] || [] );

//   table.table-striped.table#sessions
//     thead
//       tr
//         th.col-sm-5 Scenario
//         th.col-sm-1 Company
//         th.col-sm-1 Platoon
//         th.col-sm-1 Unit
//         th.col-sm-3 &nbsp;
//         th.col-sm-1 &nbsp;
//     tbody
//       each scenario_session in scenario_sessions
//         -
//           var scenario = scenario_session.scenario,
//             session = scenario_session.session;
//         if session
//           if session.instance || user.instructor
//             tr.session
//               td.col-sm-5= session.state.scenarioTitle
//                 br
//                 span.small= locals.instructorStudentsLabel( session )
//               td.col-sm-1= session.state.classroom.company
//               td.col-sm-1= session.state.classroom.platoon
//               td.col-sm-1= session.state.classroom.unit
//               td.col-sm-2 &nbsp;
//               td.col-sm-1: a.btn.btn-sm.join(href=session.instance||session.document.uri target="_blank")= session.instance ? "Join" : "Start"
//               th.col-sm-1 &nbsp;
