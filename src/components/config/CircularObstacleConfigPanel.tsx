import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import { ICircularObstacleStore } from "../../document/CircularObstacleStore";
import ExpressionInput from "../input/ExpressionInput";

type Props = { obstacle: ICircularObstacleStore | null };

type State = object;

class CircularObstacleConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    const { obstacle } = this.props;
    if (obstacle !== null) {
      return (
        <div className={styles.WaypointPanel}>
          <InputList noCheckbox>
            <ExpressionInput
              title="x"
              suffix=""
              enabled={true}
              setEnabled={(a) => null}
              number={obstacle.x}
              showCheckbox={false}
              titleTooltip={"Obstacle Center X"}
            />

            <ExpressionInput
              title="y"
              suffix=""
              enabled={true}
              setEnabled={(a) => null}
              number={obstacle.y}
              showCheckbox={false}
              titleTooltip={"Obstacle Center Y"}
            />

            <ExpressionInput
              title="r"
              suffix="m"
              enabled={true}
              setEnabled={(a) => null}
              number={obstacle.radius}
              showCheckbox={false}
              titleTooltip={"Obstacle Radius"}
            />
          </InputList>
        </div>
      );
    }
  }
}
export default observer(CircularObstacleConfigPanel);
