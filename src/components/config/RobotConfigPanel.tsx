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
      <div className={styles.Opacity}style={{display: (this.context.uiState.isRobotConfigOpen ? "block": "none")}}>
        <div className={styles.RobotConfigPanel}>
          <h2>Robot Configuration</h2>
          <IconButton className={styles.ExitButton} onClick={()=>this.context.uiState.setRobotConfigOpen(false)}><CloseIcon /></IconButton>
          <div className={styles.NumberEntryList}>
            <NumberEntry 
              title="Mass" 
              suffix="kg" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.mass} 
              setNumber={config!.setMass}
              showCheckbox={false}/>

            <NumberEntry 
              title="MoI" 
              suffix="kg · m²" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.rotationalInertia} 
              setNumber={config!.setRotationalInertia}
              showCheckbox={false}/>

            <NumberEntry 
              title="Max Velocity" 
              suffix="m/s" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelMaxVelocity} 
              setNumber={config!.setMaxVelocity}
              showCheckbox={false}/>

            <NumberEntry 
              title="Max Torque" 
              suffix="N · m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelMaxTorque} 
              setNumber={config!.setMaxTorque}
              showCheckbox={false}/>

            <NumberEntry 
              title="Width" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.bumperWidth} 
              setNumber={config!.setBumperWidth}
              showCheckbox={false}/>

            <NumberEntry 
              title="Length" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.bumperLength} 
              setNumber={config!.setBumperLength}
              showCheckbox={false}/>

            <NumberEntry 
              title="Wheelbase" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelbase} 
              setNumber={config!.setWheelbase}
              showCheckbox={false}/>

            <NumberEntry 
              title="Trackwidth" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.trackWidth} 
              setNumber={config!.setTrackwidth}
              showCheckbox={false}/>
            <NumberEntry 
              title="Wheel Radius" 
              suffix="m" 
              enabled={true} 
              setEnabled={a=>null}
              number={config.wheelRadius} 
              setNumber={config!.setWheelRadius}
              showCheckbox={false}/>
          </div>
        </div>
      </div>
    )
  }
}
export default observer(RobotConfigPanel);