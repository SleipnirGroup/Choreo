import React, { Component } from "react";
import { doc, uiState } from "./document/DocumentManager";
import { observer } from "mobx-react";
import Navbar from "./components/navbar/Navbar";
import Field from "./components/field/Field";
import Sidebar from "./components/sidebar/Sidebar";
import AppMenu from "./AppMenu";
import PathAnimationPanel from "./components/field/PathAnimationPanel";
import InputList from "./components/input/InputList";
import ExpressionInput from "./components/input/ExpressionInput";
import Input from "./components/input/Input";
import { IExpressionStore, Units } from "./document/ExpressionStore";

type Props = object;

type State = object;

class Body extends Component<Props, State> {
  state = {};

  render() {
    return (
      <>
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
