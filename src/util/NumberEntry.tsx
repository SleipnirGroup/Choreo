import { observable } from 'mobx';
import { observer } from 'mobx-react';
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
 class NumberEntry extends Component<Props, State> {
  constructor(props: Props){
    super(props);
    this.setEnabled = this.setEnabled.bind(this);
    console.log(this.props);
  }
  setEnabled(event:React.ChangeEvent<HTMLInputElement>) {
    console.log(this.props.enabled)
    this.props.setEnabled(event.target.checked);
    console.log(this.props.enabled)
  }
  render() {
    console.log(this.props.setEnabled);
    return (
      <span>{this.props.title} <input type='number' disabled={!(this.props.enabled)}></input> <input type='checkbox' onChange={this.setEnabled}></input>{`${this.props.enabled.valueOf()}`}</span>
    )
  }
}
export default observer(NumberEntry);