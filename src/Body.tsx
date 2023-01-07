import React, { Component } from "react";
import DocumentManagerContext from "./document/DocumentManager";
import { observer } from "mobx-react";
import Navbar from "./components/navbar/Navbar";
import Field from "./components/field/Field";
import RobotConfigPanel from "./components/config/RobotConfigPanel";
import Sidebar from "./components/sidebar/Sidebar";
import PathAnimationSlider from "./components/field/PathAnimationSlider";
import PathSelector from "./components/field/PathSelector";

type Props = {};

type State = {};

class Body extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <>
        <div className="App">
          <div className="Page">
            <Navbar></Navbar>
            <span
              style={{
                display: "flex",
                flexDirection: "row",
                flexGrow: 1,
                height: 0,
              }}
            >
              <Sidebar></Sidebar>
              <Field></Field>
            </span>
            <PathAnimationSlider></PathAnimationSlider>
          </div>

          <div
            className="Panel"
            style={{
              backgroundColor: "transparent",
              display: `${
                this.context.uiState.appPage === 2 ? "block" : "none"
              }`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#0013",
              }}
              onClick={() => {
                this.context.uiState.setPageNumber(1);
              }}
            ></div>
            <RobotConfigPanel></RobotConfigPanel>
          </div>
          <div
            className="Panel"
            style={{
              backgroundColor: "transparent",
              display: `${
                this.context.uiState.appPage === 0 ? "block" : "none"
              }`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#0013",
              }}
              onClick={() => {
                this.context.uiState.setPageNumber(1);
              }}
            ></div>
            <PathSelector></PathSelector>
          </div>
        </div>
      </>
    );
  }
}
export default observer(Body);
