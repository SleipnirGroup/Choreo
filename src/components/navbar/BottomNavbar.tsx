import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import { observer } from 'mobx-react';
import { BottomNavigation, BottomNavigationAction, Checkbox, Paper } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FileIcon from '@mui/icons-material/FileOpen'
import EditIcon from '@mui/icons-material/Edit'
import styles from './Navbar.module.css'

type Props = {};

type State = {};


class BottomNavbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  onChange(e:any, newValue:string) {
      let newPage=1;
      if (newValue === '0') {newPage = 0}
      else if (newValue === '1') {newPage = 1}
      else if (newValue === '2') {newPage=2}
      else {return;}
      this.context.uiState.setPageNumber(newPage);
      console.log(e);
  }
  render() {
    return (
      <BottomNavigation className={styles.Container} sx={{position:'relative'}} showLabels value={`${this.context.uiState.appPage}`} onChange={(e, newValue)=>this.onChange(e, newValue)}>
          <BottomNavigationAction label="File" value='0' icon={<FileIcon></FileIcon>}>
          </BottomNavigationAction>
          <BottomNavigationAction label="Path" value='1' icon={<EditIcon></EditIcon>}></BottomNavigationAction>
          <BottomNavigationAction label="Settings" value='2' icon={<SettingsIcon></SettingsIcon>}></BottomNavigationAction>
      </BottomNavigation>
    )
  }
}
export default observer(BottomNavbar)