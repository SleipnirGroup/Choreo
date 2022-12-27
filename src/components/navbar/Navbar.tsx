import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import ShapeLineIcon from '@mui/icons-material/ShapeLine';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import styles from './Navbar.module.css';
import PathSelect from './PathSelect';

type Props = {};

type State = {};


export default class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <div className={styles.Container}>
        <PathSelect></PathSelect>
        <span>
          <Tooltip title="Settings">
            <IconButton className={styles.action} onClick={()=>this.context.uiState.setRobotConfigOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save">
            <IconButton className={styles.action} onClick={()=>{this.context.model.saveFile()}}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Generate path">
            <IconButton className={styles.generate} onClick={()=>this.context.model.pathlist.activePath.generatePath()}>
              <ShapeLineIcon />
            </IconButton>
          </Tooltip>
        </span>
      </div>
    )
  }
}