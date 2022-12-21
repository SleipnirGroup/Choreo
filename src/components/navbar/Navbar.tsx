import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
const styles = require("./Navbar.module.css").default;

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
            {Array.from(this.context.model.pathlist.paths.keys()).
              map(key=>this.context.model.pathlist.paths.get(key))
                .map(path=><option value={path?.uuid} key={path?.uuid}>{path?.name}</option>)}
          </select>
          
          <button id="addPath"onClick={()=>console.log(this.context.model.pathlist)}>+</button>
        </span>
        <h1>
          Untitled Waypoint Editor
        </h1>
        <span>
        <button id="addPath">Export Path to JSON</button>
          <button id="generatePath">Generate Path</button>
        </span>
      </div>
    )
  }
}