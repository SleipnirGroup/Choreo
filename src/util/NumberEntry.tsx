import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { Instance, types } from 'mobx-state-tree';
import React, { Component } from 'react'
const styles = require("./NumberEntry.module.css").default;

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
    this.setNumber = this.setNumber.bind(this);
    console.log(this.props);
  }
  setEnabled(event:React.ChangeEvent<HTMLInputElement>) {
    console.log(this.props.enabled)
    this.props.setEnabled(event.target.checked);
    console.log(this.props.enabled)
  }
  setNumber(event:React.FocusEvent<HTMLInputElement>) {
    let input = Number.parseFloat(event.target.value);
    if (!Number.isNaN(input)){
        this.props.setNumber(input);
        event.target.value = `${input}`;
        console.log(input);
    } else {
        event.target.value= `${this.props.number}`;
        return;
    }
  }
  componentDidMount(): void {
      
  }
  render() {
    console.log(this.props.setEnabled);
    return (
      <div className={styles.Container}>
        <span className={styles.Title}>{this.props.title}</span>
         <input 
            type="text" inputMode="decimal" pattern="^-[0-9]*"
            className={styles.Number}
            disabled={!(this.props.enabled)}
            onBlur={this.setNumber}
            
            ></input>
         <span className={styles.Suffix}>{this.props.suffix}</span>
          <input type='checkbox' className={styles.Checkbox} checked={this.props.enabled} onChange={this.setEnabled}></input></div>
    )
  }
}
export default observer(NumberEntry);