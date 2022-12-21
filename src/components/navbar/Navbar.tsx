import React, { Component } from 'react'
import documentManager from '../../document/DocumentManager';
const styles = require("./Navbar.module.css").default;

type Props = {}

type State = {}

export default class Navbar extends Component<Props, State> {
  state = {}

  render() {
    return (
      <div className={styles.Container}>
              <span>
          <select onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>{documentManager.model.setActivePath(event.target.value);}}>
            {documentManager.model.getPaths().map((name)=><option value={name} key={name}>{name}</option>)}
          </select>
          
          <button id="addPath">+</button>
        </span>
        <h1>
          Untitled Waypoint Editor
        </h1>
        <span>
        <button id="addPath" onClick={()=>{console.log(documentManager.saveToJSON())}}>Export Path to JSON</button>
          <button id="generatePath">Generate Path</button>
        </span>
      </div>
    )
  }
}