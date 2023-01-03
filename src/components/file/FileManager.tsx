import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import SaveIcon from '@mui/icons-material/Save';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { observer } from 'mobx-react';
import { Checkbox } from '@mui/material';
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'

type Props = {};

type State = {};


class FileManager extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <div style={{backgroundColor:'#2F3136', color:'white'}}>
        <span>

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
            <Button onClick={()=>this.context.loadFile(
            "https://gist.githubusercontent.com/shueja-personal/24f91b89357f1787c11507d7eaf6461b/raw/cfd31c71b560b79b6a0a5911ef5c0f8d19867e0c/saveWithoutGenerated.json"
            )}>Demo</Button>
        </span>
      </div>
    )
  }
}
export default observer(FileManager)