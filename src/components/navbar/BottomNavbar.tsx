import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import { observer } from 'mobx-react';
import { BottomNavigation, BottomNavigationAction, Button, Checkbox, Menu, MenuItem, Paper } from '@mui/material';
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
  }
  render() {
    return (
    <>
    <div style={{height:'56px', width:'100%', position:'relative', backgroundColor:'red'}}></div>
      <BottomNavigation className={styles.Container} sx={{
        position:'absolute',
        bottom:0,
        width:'100%',
        height:56,
        paddingLeft:0,
        paddingRight:0,
        backgroundColor:'var(--background-dark-gray)',
          " .MuiBottomNavigationAction-root, .Mui-selected, svg": {
            
            color: "white",


          },
          ".MuiBottomNavigationAction-root": {
            height:'var(--bottom-nav-height)',
            borderRadius:'0px 0px 10px 10px'
          },
          " .Mui-selected": {
            backgroundColor: 'var(--background-dark-blue)'
          }
        }}
      showLabels value={`${this.context.uiState.appPage}`} onChange={(e, newValue)=>this.onChange(e, newValue)}>
          <BottomNavigationAction  disableRipple value='0' icon={<FileIcon></FileIcon>}>
          
          </BottomNavigationAction>
          <BottomNavigationAction disableRipple value='1' icon={<EditIcon></EditIcon>}></BottomNavigationAction>
          <BottomNavigationAction disableRipple value='2' icon={<SettingsIcon></SettingsIcon>}></BottomNavigationAction>
      </BottomNavigation>
      </>
    )
  }
}
export default observer(BottomNavbar)