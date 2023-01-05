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
import Sidebar from './components/sidebar/Sidebar';
import PathAnimationSlider from './components/field/PathAnimationSlider';
import PathSelect from './components/navbar/PathSelect';
import PathSelector from './components/field/PathSelector';

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
      
      

      <div className="Page">
        <Navbar></Navbar>
        <span style={{display:'flex', flexDirection:'row', flexGrow:1, height:0}}>
          <Sidebar></Sidebar>
          <Field></Field>
          
        </span>
        <PathAnimationSlider></PathAnimationSlider>

      </div>
      
      <div className="Panel" style={{display:`${(this.context.uiState.appPage === 2) ? "flex": "none"}`}}>
        <RobotConfigPanel></RobotConfigPanel>
      </div>
      <div className="Panel" style={{backgroundColor:'transparent', display:`${(this.context.uiState.appPage === 0) ? "block": "none"}`}}
      >
        <div style={{width:'100%', height:'100%',backgroundColor:'#0011',}} onClick={()=>{this.context.uiState.setPageNumber(1)}}></div>
        <PathSelector></PathSelector>
      </div>
      
    </div>
      </>
    )
  }
}
export default observer(Body)