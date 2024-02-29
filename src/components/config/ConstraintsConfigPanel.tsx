import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import { IConstraintStore } from "../../document/ConstraintStore";
import ScopeSlider from "./ScopeSlider";

type Props = { constraint: IConstraintStore };

type State = object;

class ConstraintsConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    const constraint = this.props.constraint;
    const definition = constraint.definition;
    const isSegmentConstraint = definition.sgmtScope;
    let startIndex = (this.props.constraint.getStartWaypointIndex() ?? 0) + 1;
    let endIndex = (this.props.constraint.getEndWaypointIndex() ?? 0) + 1;
    const points = this.props.constraint.getPath().waypoints;
    const pointcount = points.length;
    if (this.props.constraint.getSortedScope()[0] === "first") {
      startIndex = 0;
    }
    if (this.props.constraint.getSortedScope()[0] === "last") {
      startIndex = pointcount + 1;
    }
    if (this.props.constraint.getSortedScope()[1] === "last") {
      endIndex = pointcount + 1;
    }
    if (this.props.constraint.getSortedScope()[1] === "first") {
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
            this.props.constraint.setScope(
              selection.map((idx) => {
                if (idx == 0) {
                  return "first";
                } else if (idx == lastIdx) {
                  return "last";
                } else {
                  return { uuid: points[idx - 1]?.uuid ?? "" };
                }
              })
            );
          }}
          points={points}
        ></ScopeSlider>

        <InputList>
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
              <Input
                key={key}
                title={propdef.name}
                suffix={propdef.units}
                enabled={true}
                setEnabled={(a) => null}
                number={constraint[key]}
                setNumber={constraint[setterName]}
                showCheckbox={false}
                titleTooltip={propdef.description}
              />
            );
          })}
        </InputList>
      </div>
    );
  }
}
export default observer(ConstraintsConfigPanel);
