import React, { Component } from 'react';
import DocumentManagerContext from './document/DocumentManager';
import SaveIcon from '@mui/icons-material/Save';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { observer } from 'mobx-react';
import { Checkbox } from '@mui/material';
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import BottomNavbar from './components/navbar/BottomNavbar';
import Navbar from './components/navbar/Navbar';
import Field from './components/field/Field';
import RobotConfigPanel from './components/config/RobotConfigPanel';
import FileManager from './components/file/FileManager'

type Props = {};

type State = {};


class Body extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <>
        <div className="App">
      
      
      <div className="Page" style={{display:`${(this.context.uiState.appPage === 0) ? "block": "none"}`}}>
        <FileManager></FileManager>
      </div>
      <div className="Page" style={{display:`${(this.context.uiState.appPage === 1) ? "flex": "none"}`, flexDirection:'column'}}>
        <Navbar></Navbar>
        {/* <Sidebar></Sidebar> */}
        <Field></Field>
      </div>
      <div className="Page" style={{display:`${(this.context.uiState.appPage === 2) ? "block": "none"}`}}>
        <RobotConfigPanel></RobotConfigPanel>
      </div>
      <BottomNavbar></BottomNavbar>
    </div>
      </>
    )
  }
}
export default observer(Body)