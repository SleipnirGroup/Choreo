import React, { Component } from 'react'
const styles = require('./SidebarWaypoint.module.css').default;

type Props = {
    name: string;
}

type State = {}

export default class SidebarWaypoint extends Component<Props, State> {
  state = {}
    
  render() {
    return (
      <div className={styles.Container}>{this.props.name}</div>
    )
  }
}