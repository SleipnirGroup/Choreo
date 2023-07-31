import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import Input from "../input/Input";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";

type Props = { waypoint: IHolonomicWaypointStore | null };

type State = {};

class WaypointPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  isWaypointNonNull(
    point: IHolonomicWaypointStore | null
  ): point is IHolonomicWaypointStore {
    return (point as IHolonomicWaypointStore) !== null;
  }
  render() {
    let { waypoint } = this.props;
    if (this.isWaypointNonNull(waypoint)) {
      return (
        <div className={styles.WaypointPanel}>
          {/* <ToggleButtonGroup>
            <ToggleButton value={"full"}><Waypoint></Waypoint></ToggleButton>
            <ToggleButton value={"translation"}><Circle></Circle></ToggleButton>
            <ToggleButton value={"empty"}><CircleOutlined></CircleOutlined></ToggleButton>
          </ToggleButtonGroup> */}
          <InputList>
            <Input
              title="x"
              suffix="m"
              enabled={waypoint.translationConstrained}
              setEnabled={(enabled) =>
                waypoint!.setTranslationConstrained(enabled)
              }
              number={waypoint.x}
              setNumber={(x) => waypoint!.setX(x)}
            ></Input>
            <Input
              title="y"
              suffix="m"
              enabled={waypoint.translationConstrained}
              setEnabled={(enabled) =>
                waypoint!.setTranslationConstrained(enabled)
              }
              number={waypoint.y}
              setNumber={(y) => waypoint!.setY(y)}
            ></Input>
            <Input
              title="θ"
              suffix="rad"
              enabled={waypoint.headingConstrained}
              setEnabled={(enabled) => waypoint!.setHeadingConstrained(enabled)}
              number={waypoint.heading}
              setNumber={(heading) => waypoint!.setHeading(heading)}
              showCheckbox
            ></Input>
            <Input
              title="dir(v)"
              suffix="rad"
              enabled={waypoint.velocityAngleConstrained}
              setEnabled={waypoint!.setVelocityAngleConstrained}
              number={waypoint.velocityAngle}
              setNumber={waypoint!.setVelocityAngle}
              showCheckbox
            ></Input>
            <Input
              title="|v|"
              suffix="m/s"
              enabled={waypoint.velocityMagnitudeConstrained}
              setEnabled={waypoint!.setVelocityMagnitudeConstrained}
              number={waypoint.velocityMagnitude}
              setNumber={waypoint!.setVelocityMagnitude}
              showCheckbox
            ></Input>
            <Input
              title="ω"
              suffix="rad/s"
              enabled={waypoint.angularVelocityConstrained}
              setEnabled={waypoint!.setAngularVelocityConstrained}
              number={waypoint.angularVelocity}
              setNumber={waypoint!.setAngularVelocity}
              showCheckbox
            ></Input>
          </InputList>
        </div>
      );
    }
  }
}
export default observer(WaypointPanel);
