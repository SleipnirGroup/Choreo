import React, { Component } from 'react'
import HolonomicWaypoint from '../../datatypes/HolonomicWaypoint';
import Waypoint from '../../datatypes/Waypoint';
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
import NumberEntry from '../../util/NumberEntry';
const styles = require('./Sidebar.module.css').default;

type Props = {waypoint: IHolonomicWaypointStore}

type State = {}

export default class WaypointPanel extends Component<Props, State> {
  state = {}

  render() {
    let {waypoint} = this.props;
    if(!this.props.waypoint) {
        return <div className={styles.WaypointPanel}>No Waypoint Selected</div>
    }
    console.log(this.props.waypoint);
    return (
      <div className={styles.WaypointPanel}>
        <NumberEntry title="x" suffix="m" enabled={this.props.waypoint.xConstrained} setEnabled={(enabled)=>this.props.waypoint.setXConstrained(enabled)}
           number={waypoint.x} setNumber={x=>waypoint.setX(x)}></NumberEntry>
        {/* <NumberEntry title="y" suffix="m" defaultEnabled={this.props.waypoint.yConstrained}></NumberEntry>
        <NumberEntry title="θ" suffix="rad" defaultEnabled={this.props.waypoint.headingConstrained}></NumberEntry>
        <NumberEntry title="vx" suffix="m/s" defaultEnabled={this.props.waypoint.velocityXConstrained}></NumberEntry>
        <NumberEntry title="vy" suffix="m/s" defaultEnabled={this.props.waypoint.velocityYConstrained}></NumberEntry>
        <NumberEntry title="ω" suffix="rad/s" defaultEnabled={this.props.waypoint.angularVelocityConstrained}></NumberEntry>
        <NumberEntry title="|v|" suffix="m/s" defaultEnabled={this.props.waypoint.velocityMagnitudeConstrained}></NumberEntry> */}
      </div>
    )
  }
}