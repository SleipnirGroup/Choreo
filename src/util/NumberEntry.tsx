import { Instance, types } from 'mobx-state-tree';
import React, { Component } from 'react'

type Props = {
    title:string,
    suffix: string,
    enabled: boolean,
    number: number,
    setNumber: (arg0: number)=>void,
    setEnabled: (arg0:boolean)=>void}

type State = {}

export default class NumberEntry extends Component<Props, State> {
  constructor(props: Props){
    super(props);
    this.setEnabled = this.setEnabled.bind(this);
    console.log(this.props);
  }
  setEnabled(event:React.ChangeEvent<HTMLInputElement>) {
    this.props.setEnabled(event.target.checked);
  }
  render() {
    console.log(this.props.setEnabled);
    return (
      <span>{this.props.title} <input type='number'></input> <input type='checkbox' checked={this.props.enabled} onChange={this.setEnabled}></input></span>
    )
  }
}