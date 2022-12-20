import React, { Component } from 'react'
import SidebarWaypoint from './SidebarWaypoint';
const styles = require('./Sidebar.module.css').default;

type Props = {}

type State = {
  waypoints : Array<SidebarWaypoint>
}

export default class Sidebar extends Component<Props, State> {
  state = {waypoints: [
    new SidebarWaypoint({name:'test'}),
    new SidebarWaypoint({name:'test2'})
  ]}
  
  constructor(props: Props) {
    super(props);
  }
  render() {
    return (
      <div className={styles.Sidebar}>
        <div>{this.state.waypoints.map(
          (waypoint)=>
          waypoint.render()
          )}</div>
        <div><button id="config">Path Config</button></div>
      </div>
    )
  }
}