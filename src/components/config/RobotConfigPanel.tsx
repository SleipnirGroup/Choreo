import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import NumberEntry from '../../util/NumberEntry';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import styles from './RobotConfigPanel.module.css';

type Props = {}

type State = {}

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {}
  render() {
    let config = this.context.model.robotConfig;
    return (
        <div className={styles.RobotConfigPanel}>
          <span style={{fontWeight:'bold', fontSize:'1.2rem'}}>Robot Configuration</span>
          {/* <IconButton className={styles.ExitButton} onClick={()=>this.context.uiState.setPageNumber(1)}><CloseIcon /></IconButton> */}
          <div className={styles.NumberEntryList}>
            <NumberEntry
            longestTitle="Wheel Radius"
              title="Mass" 
              suffix="kg" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.mass} 
              setNumber={config!.setMass}
              showCheckbox={false}/>

            <NumberEntry
            longestTitle="Wheel Radius"
              title="MoI" 
              suffix="kg · m²" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.rotationalInertia} 
              setNumber={config!.setRotationalInertia}
              showCheckbox={false}/>

            <NumberEntry
            longestTitle="Wheel Radius"
              title="Max Velocity" 
              suffix="m/s" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelMaxVelocity} 
              setNumber={config!.setMaxVelocity}
              showCheckbox={false}/>

            <NumberEntry
            longestTitle="Wheel Radius"
              title="Max Torque" 
              suffix="N · m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelMaxTorque} 
              setNumber={config!.setMaxTorque}
              showCheckbox={false}/>

            <NumberEntry
            longestTitle="Wheel Radius" 
              title="Width" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.bumperWidth} 
              setNumber={config!.setBumperWidth}
              showCheckbox={false}/>

            <NumberEntry 
            longestTitle="Wheel Radius"
              title="Length" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.bumperLength} 
              setNumber={config!.setBumperLength}
              showCheckbox={false}/>

            <NumberEntry
            longestTitle="Wheel Radius" 
              title="Wheelbase" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelbase} 
              setNumber={config!.setWheelbase}
              showCheckbox={false}/>

            <NumberEntry 
            longestTitle="Wheel Radius"
              title="Trackwidth" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.trackWidth} 
              setNumber={config!.setTrackwidth}
              showCheckbox={false}/>
            <NumberEntry 
            longestTitle="Wheel Radius"
              title="Wheel Radius" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelRadius} 
              setNumber={config!.setWheelRadius}
              showCheckbox={false}/>
          </div>
        </div>
    )
  }
}
export default observer(RobotConfigPanel);