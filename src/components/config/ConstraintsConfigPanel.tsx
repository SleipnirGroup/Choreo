import { observer } from "mobx-react";
import React, { Component } from "react";
import {doc, uiState} from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import { IConstraintStore } from "../../document/ConstraintStore";
import ScopeSlider from "./ScopeSlider";
import ExpressionInput from "../input/ExpressionInput";
import ExpressionInputList from "../input/ExpressionInputList";

type Props = { constraint: IConstraintStore };

type State = object;

class ConstraintsConfigPanel extends Component<Props, State> {
  

  state = {};
  render() {
    const constraint = this.props.constraint;
    const definition = constraint.definition;
    const isSegmentConstraint = definition.sgmtScope;
    let startIndex = (this.props.constraint.getStartWaypointIndex() ?? 0) + 1;
    let endIndex = (this.props.constraint.getEndWaypointIndex() ?? 0) + 1;
    const points = this.props.constraint.getPath().path.waypoints;
    const pointcount = points.length;
    if (this.props.constraint.from === "first") {
      startIndex = 0;
    }
    if (this.props.constraint.from === "last") {
      startIndex = pointcount + 1;
    }
    if (this.props.constraint.to === "last") {
      endIndex = pointcount + 1;
    }
    if (this.props.constraint.to === "first") {
      endIndex = 0;
    }

    return (
      <div
        className={styles.WaypointPanel}
        style={{
          width: `min(80%, max(300px, calc(${pointcount} * 3ch + 8ch)))`
        }}
      >
        <ScopeSlider
          isRange={isSegmentConstraint}
          startIndex={startIndex}
          endIndex={endIndex}
          setRange={(selection) => {
            const lastIdx = pointcount + 1;
            
              const scope =selection.map((idx) => {
                if (idx == 0) {
                  return "first";
                } else if (idx == lastIdx) {
                  return "last";
                } else {
                  return { uuid: points[idx - 1]?.uuid ?? "" };
                }
              });
            this.props.constraint.setFrom(scope[0]);
            this.props.constraint.setTo(scope[1])
          }}
          points={points}
        ></ScopeSlider>

        <ExpressionInputList>
          {/* {isSegmentConstraint && <>
            <span className={inputStyles.Title}>From</span>
            <span> */}

          {/* <input className={inputStyles.Number} value={(constraint.getStartWaypointIndex() ?? -1) + 1}></input>
            <span>Start</span><span>End</span></span>
            <span></span><span></span></>
          } */}
          {Object.entries(definition.properties).map((entry) => {
            const [key, propdef] = entry;
            const setterName =
              "set" + key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <ExpressionInput
                key={key}
                title={propdef.name}
                enabled={true}
                number={constraint[key]}
                titleTooltip={propdef.description}
              />
            );
          })}
        </ExpressionInputList>
      </div>
    );
  }
}
export default observer(ConstraintsConfigPanel);
