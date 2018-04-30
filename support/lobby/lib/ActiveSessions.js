import React from "react";
import { Button } from "react-bootstrap";
import ReactTable from "react-table";

export default function ActiveSessions( props ) {
  return (
    <ReactTable
      data={ activeSessionRecords( props.records ) }
      columns={ columns }
      filterable
      className="-striped"
      defaultFilterMethod={ ( filter, row, column ) => {
        return row[ filter.id ] !== undefined ?
          String( row[ filter.id ] ).toLowerCase().indexOf( filter.value.toLowerCase() ) >= 0 : true
      } } />
  );
}

function activeSessionRecords( records ) {
  return records.filter( record => {
    const session = ( record.session || {} );
    return session.instance && !session.completion.instance.isReview;
  } );
}

const columns = [ {
  Header:
    "Scenario",
  id:
    "session.state.scenarioTitle",
  accessor:
    "session",
  Cell:
    function Cell( props ) { return <ScenarioCell { ...props }/> },
  filterMethod: ( filter, row, column ) => {
    return row[ filter.id ] !== undefined ?
      String( row[ filter.id ].state.scenarioTitle ).toLowerCase().indexOf( filter.value.toLowerCase() ) >= 0 : true
    },
}, {
  Header:
    "Company",
  accessor:
    "session.state.classroom.company",
}, {
  Header:
    "Platoon",
  accessor:
    "session.state.classroom.platoon",
}, {
  Header:
    "Unit",
  accessor:
    "session.state.classroom.unit",
}, {
  Header:
    "",
  id:
    "blank",
  accessor:
    d => "",
  sortable:
    false,
  filterable:
    false,
}, {
  Header:
    "",
  id:
    "action",
  accessor:
    "session",
  Cell:
    function Cell( props ) { return <ActionCell { ...props }/> },
  sortable:
    false,
  filterable:
    false,
} ];

class ScenarioCell extends React.Component {
  render() {
    return <React.Fragment>
      { this.props.value.state.scenarioTitle }
      <br/>
      <span className="small">{ instructorStudentsLabel( this.props.value ) }</span>
    </React.Fragment>;
  }
}

class ActionCell extends React.Component {
  render() {
    return <Button href={ this.props.value.instance || this.props.value.document.uri } target="_blank"
      bsSize="small" bsStyle="link"> { this.props.value.instance ? "Join" : "Start" } </Button>;
  }
}

// Generate the Instructor/Students annotation for a session.

function instructorStudentsLabel( session ) {

  var instanceCounts = session.completion.instance || { instructors: 0, students: 0 },
    label = "";

  if ( instanceCounts.instructors > 0 || instanceCounts.students > 0 ) {

    if ( instanceCounts.instructors > 0 ) {
      label += "Instructor, ";
    }

    if ( instanceCounts.students === 1 ) {
      label += instanceCounts.students + " student";
    } else {
      label += instanceCounts.students + " students";
    }

  }

  return label;

}
