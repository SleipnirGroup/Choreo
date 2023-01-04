
import { observer } from 'mobx-react';
import React, { Component} from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import WaypointPanel from '../sidebar/WaypointPanel';

import styles from './Field.module.css';
import FieldOverlayRoot from './svg/FieldOverlayRoot';
import AddIcon from '@mui/icons-material/Add';
import XIcon from '@mui/icons-material/Close';
import Fab from '@mui/material/Fab'
import PathAnimationSlider from './PathAnimationSlider';

type Props = {
}

type State = {
}

export class Field extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  render() {
    return (

      <div className={styles.Container}>
        
        <FieldOverlayRoot ></FieldOverlayRoot>
        <WaypointPanel waypoint={this.context.model.pathlist.activePath.lowestSelectedPoint()}></WaypointPanel>
        <PathAnimationSlider></PathAnimationSlider>
        {/* <Fab color="primary" aria-label="add" sx={{position:'absolute',bottom:10, right:10}}
        onClick={()=>{this.context.uiState.setFieldAddMode(!this.context.uiState.fieldAddMode)}}>
        {this.context.uiState.fieldAddMode ? (<XIcon/>) : (<AddIcon/>)}
        </Fab> */}
      </div>
    )
  }
}

export default observer(Field)