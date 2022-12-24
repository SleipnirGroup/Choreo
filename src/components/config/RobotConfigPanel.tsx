import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import NumberEntry from '../../util/NumberEntry';
const styles = require('./RobotConfigPanel.module.css').default;

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
          <FontAwesomeIcon icon={faXmark} className={styles.ExitButton} onClick={()=>this.context.uiState.setRobotConfigOpen(false)}></FontAwesomeIcon>
        <h2>Robot Configuration</h2>

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
          number={config.moi} 
          setNumber={config!.setMoI}
          showCheckbox={false}/>

        <NumberEntry 
          title="Max Velocity" 
          suffix="m/s" 
          enabled={true} 
          setEnabled={a=>null}
          number={config.maxVelocity} 
          setNumber={config!.setMaxVelocity}
          showCheckbox={false}/>

        <NumberEntry 
          title="Max Torque" 
          suffix="N · m" 
          enabled={true} 
          setEnabled={a=>null}
          number={config.maxTorque} 
          setNumber={config!.setMaxTorque}
          showCheckbox={false}/>

        <NumberEntry 
          title="Width incl. Bumper" 
          suffix="m" 
          enabled={true} 
          setEnabled={a=>null}
          number={config.bumperWidth} 
          setNumber={config!.setBumperWidth}
          showCheckbox={false}/>

        <NumberEntry 
          title="Length incl. Bumper" 
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
          number={config.trackwidth} 
          setNumber={config!.setTrackwidth}
          showCheckbox={false}/>
      </div>
      </div>
    )

  }
}
export default observer(RobotConfigPanel);