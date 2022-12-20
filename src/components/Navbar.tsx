import React, { Component } from 'react'
const styles = require("./Navbar.module.css").default;

type Props = {}

type State = {}

export default class Navbar extends Component<Props, State> {
  state = {}

  render() {
    return (
      <div className={styles.Container}>
        <span>
          <select>
            <option>Four ball auto</option>
          </select>
          <button id="addPath">+</button>
          <button id="deletePath">-</button>
        </span>
        <h1>
          Untitled Waypoint Editor
        </h1>
        <span>
          <button id="generatePath">Generate Path</button>
        </span>
      </div>
    )
  }
}