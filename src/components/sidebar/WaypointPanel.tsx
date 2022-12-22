import { observer } from 'mobx-react';
import React, { Component } from 'react'
import HolonomicWaypoint from '../../datatypes/HolonomicWaypoint';
import Waypoint from '../../datatypes/Waypoint';
import DocumentManagerContext from '../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
import NumberEntry from '../../util/NumberEntry';
const styles = require('./Sidebar.module.css').default;

type Props = {waypoint: IHolonomicWaypointStore}

type State = {}

class WaypointPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {}

  render() {
    let {waypoint} = this.props;
    if(!this.props.waypoint) {
        return <div className={styles.WaypointPanel}>No Waypoint Selected</div>
    }
    console.log(this.props.waypoint);
    return (
      <div className={styles.WaypointPanel}>
        {JSON.stringify(this.props.waypoint, null, 1)}<br></br>
        <NumberEntry 
          title="x" 
          suffix="m" 
          enabled={this.props.waypoint.xConstrained} 
          setEnabled={enabled=>this.props.waypoint.setXConstrained(enabled)}
          number={waypoint.x} 
          setNumber={x=>waypoint.setX(x)}></NumberEntry>
        <NumberEntry 
          title="y" 
          suffix="m" 
          enabled={this.props.waypoint.yConstrained} 
          setEnabled={enabled=>this.props.waypoint.setYConstrained(enabled)}
          number={waypoint.y} 
          setNumber={y=>waypoint.setY(y)}></NumberEntry>
        <NumberEntry 
          title="θ" 
          suffix="rad" 
          enabled={this.props.waypoint.headingConstrained} 
          setEnabled={enabled=>this.props.waypoint.setHeadingConstrained(enabled)}
          number={waypoint.heading} 
          setNumber={heading=>waypoint.setHeading(heading)}></NumberEntry>
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
export default observer(WaypointPanel);