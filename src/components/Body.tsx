import React, { Component } from 'react'
import FieldBackground from './FieldBackground';
import Navbar from './Navbar'
import Sidebar from './Sidebar'
const styles = require('./Body.module.css').default;

type Props = {}

type State = {}
export default class Body extends Component<Props, State> {
  state = {}
  
  render() {
    console.log(styles);
    return (
      <div className={styles.Container}><Sidebar></Sidebar><FieldBackground></FieldBackground></div>
    )
  }
}