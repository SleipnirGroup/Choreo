import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import inputStyles from "../input/InputList.module.css";
import { IConstraintStore } from "../../document/ConstraintStore";

type Props = {constraint: IConstraintStore};

type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let constraint = this.props.constraint;
    let definition = constraint.definition;
    let isSegmentConstraint = constraint.scope.length == 2
    return (
      <div className={styles.WaypointPanel} style={{display: (Object.entries(definition.properties).length == 0) ? "none" : "unset"}}>


        <InputList noCheckbox>
          {isSegmentConstraint && <>
            <span className={inputStyles.Title}>From</span>
            <input className={inputStyles.Number} value={(constraint.getStartWaypointIndex() ?? -1) + 1}></input>
            <span></span><span></span></>
            }
            {(Object.entries(definition.properties).map((entry)=>{
                let [key, propdef] = entry;
                let setterName = "set" + key.charAt(0).toUpperCase() + key.slice(1);
                return (
                <Input
                key = {key}
                    title={propdef.name}
                    suffix={propdef.units}
                    enabled={true}
                    setEnabled={(a) => null}
                    //@ts-ignore
                    number={constraint[key]}
                    //@ts-ignore
                    setNumber={constraint[setterName]}
                    showCheckbox={false}
                  />
                )
            }))}
        </InputList>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
