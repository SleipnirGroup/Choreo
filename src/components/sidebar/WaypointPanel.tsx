import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton';
import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
import NumberEntry from '../../util/NumberEntry';
import styles from './Sidebar.module.css';
import { Tooltip } from '@mui/material';

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
      <div className={styles.WaypointPanel} style={{width:(this.context.uiState.waypointPanelOpen ? "": "auto")}}>
        <span style={{display:'flex', flexDirection:'row', justifyContent:'flex-start'}}>
        <Tooltip title='Delete Waypoint'>

        <IconButton onClick={()=>this.context.model.pathlist.activePath.deleteWaypointUUID(waypoint?.uuid || "")}><DeleteIcon ></DeleteIcon></IconButton>
        </Tooltip>
        <Tooltip title="Edit Waypoint">
        <IconButton onClick={()=>this.context.uiState.setWaypointPanelOpen(!this.context.uiState.waypointPanelOpen)}><EditIcon></EditIcon></IconButton>
        </Tooltip>

        </span>
        {this.context.uiState.waypointPanelOpen && (<>

        <span>
        <NumberEntry
          longestTitle='dir(v)'
          title="x" 
          suffix="m" 
          enabled={waypoint.xConstrained} 
          setEnabled={enabled=>waypoint!.setXConstrained(enabled)}
          number={waypoint.x} 
          setNumber={x=>waypoint!.setX(x)}
          showCheckbox></NumberEntry>
        <NumberEntry
        longestTitle='dir(v)'
          title="y" 
          suffix="m" 
          enabled={waypoint.yConstrained} 
          setEnabled={enabled=>waypoint!.setYConstrained(enabled)}
          number={waypoint.y} 
          setNumber={y=>waypoint!.setY(y)} showCheckbox></NumberEntry>
        <NumberEntry 
        longestTitle='dir(v)'
          title="θ" 
          suffix="rad" 
          enabled={waypoint.headingConstrained} 
          setEnabled={enabled=>waypoint!.setHeadingConstrained(enabled)}
          number={waypoint.heading} 
          setNumber={heading=>waypoint!.setHeading(heading)} showCheckbox></NumberEntry>
        </span>
        <span>
        <NumberEntry
        longestTitle='dir(v)' 
          title="dir(v)" 
          suffix="rad" 
          enabled={waypoint.velocityAngleConstrained} 
          setEnabled={waypoint!.setVelocityAngleConstrained}
          number={waypoint.velocityAngle} 
          setNumber={waypoint!.setVelocityAngle} showCheckbox></NumberEntry>
        <NumberEntry
        longestTitle='dir(v)' 
          title="|v|" 
          suffix="m/s" 
          enabled={waypoint.velocityMagnitudeConstrained} 
          setEnabled={waypoint!.setVelocityMagnitudeConstrained}
          number={waypoint.velocityMagnitude} 
          setNumber={waypoint!.setVelocityMagnitude} showCheckbox></NumberEntry>
        <NumberEntry
        longestTitle='dir(v)' 
          title="ω" 
          suffix="rad/s" 
          enabled={waypoint.angularVelocityConstrained} 
          setEnabled={waypoint!.setAngularVelocityConstrained}
          number={waypoint.angularVelocity} 
          setNumber={waypoint!.setAngularVelocity} showCheckbox></NumberEntry>
        </span></>)}

      </div>
    )}
    else {
      return <></>
  }
  }
}
export default observer(WaypointPanel);