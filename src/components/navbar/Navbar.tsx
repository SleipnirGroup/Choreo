import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import ShapeLineIcon from '@mui/icons-material/ShapeLine';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import GridOnIcon from '@mui/icons-material/GridOn'
import GridOffIcon from '@mui/icons-material/GridOff'
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import styles from './Navbar.module.css';
import PathSelect from './PathSelect';
import { observer } from 'mobx-react';
import { Checkbox } from '@mui/material';
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import FileSelect from './FileSelect'

type Props = {};

type State = {};


class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <div className={styles.Container}>
        <PathSelect></PathSelect>
        <FileSelect></FileSelect>

        <span>

          <Button onClick={()=>this.context.loadFile(
"https://gist.githubusercontent.com/shueja-personal/24f91b89357f1787c11507d7eaf6461b/raw/cfd31c71b560b79b6a0a5911ef5c0f8d19867e0c/saveWithoutGenerated.json"
)}>Demo</Button>
          <Tooltip title="Settings">
            <IconButton className={styles.action} onClick={()=>this.context.uiState.setRobotConfigOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>


          <Tooltip title="Generate path">
            <span>
            <IconButton className={styles.generate} disabled={!this.context.model.pathlist.activePath.canGenerate()} onClick={()=>this.context.model.pathlist.activePath.generatePath()}>
              <ShapeLineIcon />
            </IconButton>
            </span>
          </Tooltip>
        </span>
      </div>
    )
  }
}
export default observer(Navbar)