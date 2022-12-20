import React, { Component } from 'react'
import Field from './Field';
const styles = require('./Body.module.css').default;

type Props = {}

type State = {}
export default class Body extends Component<Props, State> {
  state = {}
  
  render() {

    return (
      <div className={styles.Container}><Field containerHeight={300} containerWidth={300}></Field></div>
    )
  }
}