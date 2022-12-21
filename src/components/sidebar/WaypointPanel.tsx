import React, { Component } from 'react'
import HolonomicWaypoint from '../../datatypes/HolonomicWaypoint';
import Waypoint from '../../datatypes/Waypoint';
const styles = require('./Sidebar.module.css').default;

type Props = {waypoint: HolonomicWaypoint}

type State = {}

export default class WaypointPanel extends Component<Props, State> {
  state = {}

  render() {
    return (
      <div className={styles.WaypointPanel}>{this.props.waypoint.uuid}</div>
    )
  }
}