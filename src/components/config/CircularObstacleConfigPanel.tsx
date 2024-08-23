import { observer } from "mobx-react";
import React, { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import { ICircularObstacleStore } from "../../document/CircularObstacleStore";
import ExpressionInput from "../input/ExpressionInput";
import ExpressionInputList from "../input/ExpressionInputList";

type Props = { obstacle: ICircularObstacleStore | null };

type State = object;

class CircularObstacleConfigPanel extends Component<Props, State> {
  state = {};
  render() {
    const { obstacle } = this.props;
    if (obstacle !== null) {
      return (
        <div className={styles.WaypointPanel}>
          <ExpressionInputList>
            <ExpressionInput
              title="x"
              enabled={true}
              number={obstacle.x}
              titleTooltip={"Obstacle Center X"}
            />

            <ExpressionInput
              title="y"
              enabled={true}
              number={obstacle.y}
              titleTooltip={"Obstacle Center Y"}
            />

            <ExpressionInput
              title="r"
              enabled={true}
              number={obstacle.radius}
              titleTooltip={"Obstacle Radius"}
            />
          </ExpressionInputList>
        </div>
      );
    }
  }
}
export default observer(CircularObstacleConfigPanel);
