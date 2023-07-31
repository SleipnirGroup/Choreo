import React, { Component } from "react";
import DocumentManagerContext from "./document/DocumentManager";
import { observer } from "mobx-react";
import Navbar from "./components/navbar/Navbar";
import Field from "./components/field/Field";
import Sidebar from "./components/sidebar/Sidebar";
import PathAnimationSlider from "./components/field/PathAnimationSlider";
import { height } from "@mui/system";
import { Drawer } from "@mui/material";
import AppMenu from "./AppMenu";

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
            <AppMenu></AppMenu>
            <span
              style={{
                display: "flex",
                flexDirection: "row",
                flexGrow: 1,
                height: 0,
              }}
            >
              <Sidebar></Sidebar>
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                }}
              >
                <Navbar></Navbar>
                <Field></Field>
              </span>
            </span>
            <PathAnimationSlider></PathAnimationSlider>
          </div>
        </div>
      </>
    );
  }
}
export default observer(Body);
