import { Component } from "react";
import { observer } from "mobx-react";
import Navbar from "./components/navbar/Navbar";
import Field from "./components/field/Field";
import Sidebar from "./components/sidebar/Sidebar";
import AppMenu from "./AppMenu";
import PathAnimationPanel from "./components/field/PathAnimationPanel";
import ExpressionsConfigPanel from "./components/config/variables/ExpressionsConfigPanel";
import VariablesDocument from "./components/config/newvariables/VariablesDocument";
import {Group, Panel, Separator} from "react-resizable-panels"
import GenerationButton from "./components/field/GenerationButton";
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
            <Group style={{minHeight: 0, flexGrow: 1}}
            >
              <Panel minSize={300} defaultSize={300} maxSize={"50%"} style={{height:"100%"}}><Sidebar></Sidebar></Panel>
              <Panel>
                
                <Group style={{height:"100%"}} orientation="vertical">
                  <Navbar></Navbar>
                  <Panel minSize={96}><Field></Field></Panel>
                {/* <Panel style={{pointerEvents: "none", position:"relative"}}><GenerationButton></GenerationButton></Panel> */}
                <Separator style={{height:"min-content", background:"blue", color:"white", textAlign:"center"}}>Variables</Separator>
<Panel maxSize={"60%"}><VariablesDocument></VariablesDocument></Panel>
                </Group>
                </Panel>
              </Group>
            <PathAnimationPanel></PathAnimationPanel>
          </div>
        </div>
      </>
    );
  }
}
export default observer(Body);
