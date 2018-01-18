import React from "react";
import { Table, Button } from "react-bootstrap";
import dateFormat from "dateformat";

export default function Reviews( props ) {
  return <Table striped>
    <thead>
      <Head/>
    </thead>
    <tbody>
      <ReviewRows records={ props.records }/>
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

function ReviewRows( props ) {
  return <React.Fragment>
    { props.records.map( ( record, index ) => <Review key={ index } { ...record }/> ) }
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
      { dateFormat( session.document.timestamp ) }
    </td><td>
      <Button href={ session.instance || session.document.uri } target="_blank" bsSize="small"> Review </Button>
    </td>
  </tr>;
}
