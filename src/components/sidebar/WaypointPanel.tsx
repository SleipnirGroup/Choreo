import { observer } from 'mobx-react';
import React, { Component } from 'react'
import HolonomicWaypoint from '../../datatypes/HolonomicWaypoint';
import Waypoint from '../../datatypes/Waypoint';
import DocumentManagerContext from '../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
import NumberEntry from '../../util/NumberEntry';
const styles = require('./Sidebar.module.css').default;

type Props = {waypoint: IHolonomicWaypointStore | null}

type State = {}

class WaypointPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {}

  isWaypointNonNull(point: IHolonomicWaypointStore | null): point is IHolonomicWaypointStore {
    return (point as IHolonomicWaypointStore) !==null;
  }
  render() {
    let {waypoint} = this.props;
    if(this.isWaypointNonNull(waypoint)) {

    console.log(waypoint);
    return (
      <div className={styles.WaypointPanel}>
        {JSON.stringify(waypoint, null, 1)}<br></br>
        <NumberEntry 
          title="x" 
          suffix="m" 
          enabled={waypoint.xConstrained} 
          setEnabled={enabled=>waypoint!.setXConstrained(enabled)}
          number={waypoint.x} 
          setNumber={x=>waypoint!.setX(x)}></NumberEntry>
        <NumberEntry 
          title="y" 
          suffix="m" 
          enabled={waypoint.yConstrained} 
          setEnabled={enabled=>waypoint!.setYConstrained(enabled)}
          number={waypoint.y} 
          setNumber={y=>waypoint!.setY(y)}></NumberEntry>
        <NumberEntry 
          title="θ" 
          suffix="rad" 
          enabled={waypoint.headingConstrained} 
          setEnabled={enabled=>waypoint!.setHeadingConstrained(enabled)}
          number={waypoint.heading} 
          setNumber={heading=>waypoint!.setHeading(heading)}></NumberEntry>
        {/* <NumberEntry title="y" suffix="m" defaultEnabled={this.props.waypoint.yConstrained}></NumberEntry>
        <NumberEntry title="θ" suffix="rad" defaultEnabled={this.props.waypoint.headingConstrained}></NumberEntry>
        <NumberEntry title="vx" suffix="m/s" defaultEnabled={this.props.waypoint.velocityXConstrained}></NumberEntry>
        <NumberEntry title="vy" suffix="m/s" defaultEnabled={this.props.waypoint.velocityYConstrained}></NumberEntry>
        <NumberEntry title="ω" suffix="rad/s" defaultEnabled={this.props.waypoint.angularVelocityConstrained}></NumberEntry>
        <NumberEntry title="|v|" suffix="m/s" defaultEnabled={this.props.waypoint.velocityMagnitudeConstrained}></NumberEntry> */}
      </div>
    )}
    else {
      return <div className={styles.WaypointPanel}>No Waypoint Selected</div>
  }
  }
}
export default observer(WaypointPanel);