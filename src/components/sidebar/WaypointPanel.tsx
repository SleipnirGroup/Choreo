import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/DocumentModel";
import Input from "../input/Input";
import styles from "./Sidebar.module.css";
import { Tooltip } from "@mui/material";
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
        <div
          className={styles.WaypointPanel}
          style={{
            width: this.context.model.uiState.waypointPanelOpen ? "" : "auto",
          }}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-start",
            }}
          >
            <Tooltip title="Delete Waypoint">
              <IconButton
                onClick={() =>
                  this.context.model.pathlist.activePath.deleteWaypointUUID(
                    waypoint?.uuid || ""
                  )
                }
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Waypoint">
              <IconButton
                onClick={() =>
                  this.context.model.uiState.setWaypointPanelOpen(
                    !this.context.model.uiState.waypointPanelOpen
                  )
                }
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          </span>
          {this.context.model.uiState.waypointPanelOpen && (
            <>
              <InputList>
                <Input
                  title="x"
                  suffix="m"
                  enabled={waypoint.xConstrained}
                  setEnabled={(enabled) => waypoint!.setXConstrained(enabled)}
                  number={waypoint.x}
                  setNumber={(x) => waypoint!.setX(x)}
                  showCheckbox
                ></Input>
                <Input
                  title="y"
                  suffix="m"
                  enabled={waypoint.yConstrained}
                  setEnabled={(enabled) => waypoint!.setYConstrained(enabled)}
                  number={waypoint.y}
                  setNumber={(y) => waypoint!.setY(y)}
                  showCheckbox
                ></Input>
                <Input
                  title="θ"
                  suffix="rad"
                  enabled={waypoint.headingConstrained}
                  setEnabled={(enabled) =>
                    waypoint!.setHeadingConstrained(enabled)
                  }
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
            </>
          )}
        </div>
      );
    } else {
      return <></>;
    }
  }
}
export default observer(WaypointPanel);
