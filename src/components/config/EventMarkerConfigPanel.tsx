import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import ScopeSlider from "./ScopeSlider";
import { IEventMarkerStore } from "../../document/EventMarkerStore";

type Props = { marker: IEventMarkerStore };

type State = {};

class ConstraintsConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let marker = this.props.marker;

    let startIndex = (this.props.marker.getTargetIndex() ?? 0) + 1;
    let points = this.props.marker.getPath().waypoints;
    let pointcount = points.length;
    if (this.props.marker.target === "first") {
      startIndex = 0;
    }
    if (this.props.marker.target === "last") {
      startIndex = pointcount + 1;
    }

    return (
      <div
        className={styles.WaypointPanel}
        style={{
          width: `min(80%, max(300px, calc(${pointcount} * 3ch + 8ch)))`,
        }}
      >
        <ScopeSlider
          isRange={false}
          startIndex={startIndex}
          endIndex={startIndex}
          setRange={selection=>{
            const lastIdx = pointcount + 1;
            let idx = selection[0];
                  if (idx == 0) {
                    this.props.marker.setTarget("first");
                  } else if (idx == lastIdx) {
                    this.props.marker.setTarget("last");
                  } else {
                    this.props.marker.setTarget({uuid: points[idx - 1]?.uuid ?? "" });
                  }

          }}
          points={points}></ScopeSlider>

        <InputList>
              <Input
                key={"offset"}
                title={"Offset"}
                suffix={"s"}
                enabled={true}
                setEnabled={(a) => null}
                //@ts-ignore
                number={this.props.marker.offset}
                //@ts-ignore
                setNumber={(offset)=>this.props.marker.setOffset(offset)}
                showCheckbox={false}
                titleTooltip={"The marker's time offset before or after this waypoint"}
              />
        </InputList>
      </div>
    );
  }
}
export default observer(ConstraintsConfigPanel);
