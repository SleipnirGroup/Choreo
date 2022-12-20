import React, { Component } from 'react'
import Field from './Field';
import Sidebar from './Sidebar'
const styles = require('./Body.module.css').default;

type Props = {}

type State = {}
export default class Body extends Component<Props, State> {
  state = {}
  
  render() {

    return (
      <div className={styles.Container}><Sidebar></Sidebar><Field containerHeight={300} containerWidth={300}></Field></div>
    )
  }
}