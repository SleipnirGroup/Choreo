import React, { Component } from 'react'
import style from './FieldBackground'

type Props = {
  
}

type State = {imgSrc :string}


export default class FieldBackground extends Component<Props, State> {
  state = {
    imgSrc: "/fields/2022.png"
  }

  render() {
    return (
      <div><img src={this.state.imgSrc} id="field-background" alt="field background" width='100%'></img></div>
    )
  }
}