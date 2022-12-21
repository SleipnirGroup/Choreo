import React, { Component } from 'react'
import HolonomicWaypoint from '../../datatypes/HolonomicWaypoint';
import Waypoint from '../../datatypes/Waypoint';
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
const styles = require('./Sidebar.module.css').default;

type Props = {waypoint: IHolonomicWaypointStore}

type State = {}

export default class WaypointPanel extends Component<Props, State> {
  state = {}

  render() {
    if(!this.props.waypoint) {
        return <div className={styles.WaypointPanel}>No Waypoint Selected</div>
    }
    return (
      <div className={styles.WaypointPanel}>{this.props.waypoint.uuid}</div>
    )
  }
}