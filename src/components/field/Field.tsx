
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
import ShapeLineIcon from '@mui/icons-material/ShapeLine';
import PathSelector from './PathSelector';

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
        
        <Fab color="primary" aria-label="add" size="medium" sx={{position:'absolute',bottom:10, right:10}}
        onClick={()=>{this.context.model.pathlist.activePath.generatePath()}} disabled={!this.context.model.pathlist.activePath.canGenerate()}>
        <ShapeLineIcon></ShapeLineIcon>
        </Fab>
      </div>
    )
  }
}

export default observer(Field)