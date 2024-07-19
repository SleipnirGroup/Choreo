import React, { Component } from "react";
import DocumentManagerContext from "./document/DocumentManager";
import { observer } from "mobx-react";
import Navbar from "./components/navbar/Navbar";
import Field from "./components/field/Field";
import Sidebar from "./components/sidebar/Sidebar";
import AppMenu from "./AppMenu";
import PathAnimationPanel from "./components/field/PathAnimationPanel";
import InputList from "./components/input/InputList";
import ExpressionInput from "./components/input/ExpressionInput";
import Input from "./components/input/Input";
import {IExpressionStore, Units } from "./document/ExpressionStore";

type Props = object;

type State = object;

class Body extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    const expression = (this.context.model.variables.store.get("name")! as IExpressionStore);
    const variable = (this.context.model.variables.store.get("pose")! as IExpressionStore);
    //expression.setEvaluator((node)=>node.evaluate({pose: {x: variable.evaluate}}));
    return (
      <>
          <div style={{backgroundColor:"black"}}>
        <InputList>
        <ExpressionInput number={expression} title={"Expression"} suffix={""} enabled={true} setEnabled={function (value: boolean): void {
          } }></ExpressionInput>
        <ExpressionInput number={variable} title={"Dependent"} suffix={""} enabled={true} setEnabled={function (value: boolean): void {
          } }></ExpressionInput>
          {/* <Input title={"Original"} suffix={"m"} enabled={false} number={value??NaN} setNumber={function (newNumber: number): void {
            } } setEnabled={function (value: boolean): void {
            } }></Input> */}
        </InputList>
</div>
        <div className="App">
          <div className="Page">
            <AppMenu></AppMenu>
            <span
              style={{
                display: "flex",
                flexDirection: "row",
                flexGrow: 1,
                height: 0,
                width: "100%"
              }}
            >
              <Sidebar></Sidebar>
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  width: 0
                }}
              >
                <Navbar></Navbar>
                <Field></Field>
              </span>
            </span>
            <PathAnimationPanel></PathAnimationPanel>
          </div>
        </div>
      </>
    );
  }
}
export default observer(Body);
