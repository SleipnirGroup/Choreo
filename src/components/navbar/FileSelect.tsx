import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import ShapeLineIcon from '@mui/icons-material/ShapeLine';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import GridOnIcon from '@mui/icons-material/GridOn'
import GridOffIcon from '@mui/icons-material/GridOff'
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PathSelect from './PathSelect';
import { observer } from 'mobx-react';
import { Checkbox } from '@mui/material';
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'

type Props = {};

type State = {};


class FileSelect extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <div>
        <span>
          <ButtonGroup variant='contained'>

          <Button component='span'>
          <input type="file" id='file-upload-input' style={{display:'none'}} onChange={(e)=>{
            console.log(e)
            if (e.target !=null && e.target.files != null && e.target.files.length >= 1) {
              let fileList = e.target.files;
              this.context.onFileUpload(
                fileList[0]
              )
              e.target.value = '';
              
            } 
          } }

          ></input>
            Upload
          </Button>
            <IconButton  onClick={()=>{this.context.saveFile()}}>
              <SaveIcon />
            </IconButton>
          </ButtonGroup>
        </span>
      </div>
    )
  }
}
export default observer(FileSelect)