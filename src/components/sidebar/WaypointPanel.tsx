import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
import NumberEntry from '../../util/NumberEntry';
import styles from './Sidebar.module.css';

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

    return (
      <div className={styles.WaypointPanel}>
        <FontAwesomeIcon icon={faTrashCan} onClick={()=>this.context.model.pathlist.activePath.deleteWaypointUUID(this.props.waypoint?.uuid || "")}></FontAwesomeIcon>
        <span>
        <NumberEntry 
          title="x" 
          suffix="m" 
          enabled={waypoint.xConstrained} 
          setEnabled={enabled=>waypoint!.setXConstrained(enabled)}
          number={waypoint.x} 
          setNumber={x=>waypoint!.setX(x)}
          showCheckbox></NumberEntry>
        <NumberEntry 
          title="y" 
          suffix="m" 
          enabled={waypoint.yConstrained} 
          setEnabled={enabled=>waypoint!.setYConstrained(enabled)}
          number={waypoint.y} 
          setNumber={y=>waypoint!.setY(y)} showCheckbox></NumberEntry>
        <NumberEntry 
          title="θ" 
          suffix="rad" 
          enabled={waypoint.headingConstrained} 
          setEnabled={enabled=>waypoint!.setHeadingConstrained(enabled)}
          number={waypoint.heading} 
          setNumber={heading=>waypoint!.setHeading(heading)} showCheckbox></NumberEntry>
        </span>
        <span>
        <NumberEntry 
          title="dir(v)" 
          suffix="rad" 
          enabled={waypoint.velocityAngleConstrained} 
          setEnabled={waypoint!.setVelocityAngleConstrained}
          number={waypoint.velocityAngle} 
          setNumber={waypoint!.setVelocityAngle} showCheckbox></NumberEntry>
        <NumberEntry 
          title="|v|" 
          suffix="m/s" 
          enabled={waypoint.velocityMagnitudeConstrained} 
          setEnabled={waypoint!.setVelocityMagnitudeConstrained}
          number={waypoint.velocityMagnitude} 
          setNumber={waypoint!.setVelocityMagnitude} showCheckbox></NumberEntry>
        <NumberEntry 
          title="ω" 
          suffix="rad/s" 
          enabled={waypoint.angularVelocityConstrained} 
          setEnabled={waypoint!.setAngularVelocityConstrained}
          number={waypoint.angularVelocity} 
          setNumber={waypoint!.setAngularVelocity} showCheckbox></NumberEntry>
        </span>
        {/*
        <NumberEntry title="vx" suffix="m/s" defaultEnabled={this.props.waypoint.velocityXConstrained}></NumberEntry>
        <NumberEntry title="vy" suffix="m/s" defaultEnabled={this.props.waypoint.velocityYConstrained}></NumberEntry>
        <NumberEntry title="ω" suffix="rad/s" defaultEnabled={this.props.waypoint.angularVelocityConstrained}></NumberEntry>
        <NumberEntry title="|v|" suffix="m/s" defaultEnabled={this.props.waypoint.velocityMagnitudeConstrained}></NumberEntry> */}
      </div>
    )}
    else {
      return <></>
  }
  }
}
export default observer(WaypointPanel);