
import { observer } from 'mobx-react';
import React, { Component} from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import WaypointPanel from '../sidebar/WaypointPanel';

import styles from './Field.module.css';
import FieldOverlayRoot from './svg/FieldOverlayRoot';
import AddIcon from '@mui/icons-material/Add';
import XIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton'
import PathAnimationSlider from './PathAnimationSlider';
import ShapeLineIcon from '@mui/icons-material/ShapeLine';
import PathSelector from './PathSelector';
import { Tooltip } from '@mui/material';

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
        <Tooltip placement="top-start"
        title={(this.context.model.pathlist.activePath.canGenerate() ? 'Generate Path': 'Generate Path (needs 2 waypoints)')}>
          <IconButton color="primary" aria-label="add" size="large" style={{pointerEvents:'all'}}
            sx={{position:'absolute',
              bottom:10, right:10,
              transformOrigin:'100% 100%', transform:'scale(1.3)',
              borderRadius:'50%',boxShadow:'3px',
              }}
          onClick={()=>{this.context.model.pathlist.activePath.generatePath()}} disabled={!this.context.model.pathlist.activePath.canGenerate()}>
        <ShapeLineIcon></ShapeLineIcon>
        </IconButton>
        </Tooltip>
      </div>
    )
  }
}

export default observer(Field)