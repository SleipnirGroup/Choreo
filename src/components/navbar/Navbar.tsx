import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
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
          <IconButton className={styles.action} onClick={()=>this.context.uiState.setRobotConfigOpen(true)}><SettingsIcon /></IconButton>
          <IconButton className={styles.action} onClick={()=>{this.context.model.saveFile()}}><SaveIcon /></IconButton>
          <Button variant="contained" className={styles.action} onClick={()=>this.context.model.pathlist.activePath.generatePath()}>Generate Path</Button>
        </span>
      </div>
    )
  }
}