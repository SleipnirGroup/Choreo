import React, { Component } from 'react'
const styles = require("./Field.module.css").default;

type Props = {
  
}

type State = {imgSrc :string}

export default class Field extends Component<Props, State> {
  state = {
    imgSrc: "/fields/2022.png"
  }

  render() {
    return (
      <div className={styles.Container}><img src={this.state.imgSrc} id="field-background" alt="field background"></img></div>
    )
  }
}