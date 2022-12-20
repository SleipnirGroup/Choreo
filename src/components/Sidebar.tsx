import React, { Component } from 'react'
const styles = require('./Sidebar.module.css').default;

type Props = {}

type State = {
    width: number;
}

export default class Sidebar extends Component<Props, State> {

    
  render() {
    return (
      <div className={styles.Sidebar}>
        <div>Waypoint List</div>
        <div><button id="config">Path Config</button></div>
      </div>
    )
  }
}