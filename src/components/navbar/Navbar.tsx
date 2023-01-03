import React, { Component } from 'react';
import DocumentManagerContext from '../../document/DocumentManager';
import ShapeLineIcon from '@mui/icons-material/ShapeLine';
import SettingsIcon from '@mui/icons-material/Settings';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import styles from './Navbar.module.css';
import PathSelect from './PathSelect';
import { observer } from 'mobx-react';
import Button from '@mui/material/Button'
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

        <span>

          
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