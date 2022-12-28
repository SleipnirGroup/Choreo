import React, { Component } from 'react';
import Select, { OptionProps, components } from 'react-select';
import DocumentManagerContext from '../../document/DocumentManager';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faGear,
  faPlus,
  faSave,
  faTrash
} from "@fortawesome/free-solid-svg-icons";
import styles from './Navbar.module.css';
import { IHolonomicPathStore } from '../../document/DocumentModel';
import PathSelect from './PathSelect';
import { observer } from 'mobx-react';

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
          Grid
          <input type='checkbox' checked={this.context.uiState.fieldGridView} onChange={(e)=>this.context.uiState.setFieldGridView(e.target.checked)}></input>
        <button id="addPath" className={styles.action} onClick={()=>this.context.uiState.setRobotConfigOpen(true)}>
              <FontAwesomeIcon icon={faGear}></FontAwesomeIcon>
        </button>
        <button id="save" className={styles.action} onClick={()=>{this.context.model.saveFile()}}><FontAwesomeIcon icon={faSave}></FontAwesomeIcon></button>
        <button id="generatePath" className={styles.action} onClick={()=>this.context.model.pathlist.activePath.generatePath()}>Generate Path</button>
        </span>
      </div>
    )
  }
}
export default observer(Navbar)