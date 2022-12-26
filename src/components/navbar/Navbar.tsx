import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import styles from './Navbar.module.css';

type Props = {}

type State = {}

export default class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {}

  render() {
    return (
      <div className={styles.Container}>
              <span>
          <select onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>{this.context.model.pathlist.setActivePathUUID(event.target.value);}}>

            {Array.from(this.context.model.pathlist.paths.keys())
            .map(key=>this.context.model.pathlist.paths.get(key))
                .map(path=><option value={path?.uuid} key={path?.uuid}>{path?.name}</option>)}
          </select>
          
          <button id="addPath" >+</button>

        </span>
        <h1>
          uwu
        </h1>
        <span>
        <button id="save" onClick={()=>{this.context.model.saveFile()}}>Save Document JSON</button>
          <button id="generatePath" onClick={()=>this.context.model.pathlist.activePath.generatePath()}>Generate Path</button>
        </span>
      </div>
    )
  }
}