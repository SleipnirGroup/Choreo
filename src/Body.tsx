import React, { Component } from "react";
import DocumentManagerContext from "./document/DocumentManager";
import { observer } from "mobx-react";
import Navbar from "./components/navbar/Navbar";
import Field from "./components/field/Field";
import Sidebar from "./components/sidebar/Sidebar";
import PathAnimationSlider from "./components/field/PathAnimationSlider";

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
        </div>
      </>
    );
  }
}
export default observer(Body);
