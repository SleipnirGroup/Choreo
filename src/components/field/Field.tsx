import { observer } from "mobx-react";
import { Component } from "react";
import {
  doc,
  generateWithToastsAndExport
} from "../../document/DocumentManager";
import WaypointPanel from "../config/WaypointConfigPanel";

import { Close } from "@mui/icons-material";
import ShapeLineIcon from "@mui/icons-material/ShapeLine";
import { CircularProgress, Tooltip } from "@mui/material";
import Box from "@mui/material/Box/Box";
import IconButton from "@mui/material/IconButton";
import "react-toastify/dist/ReactToastify.min.css";
import { ICircularObstacleStore } from "../../document/CircularObstacleStore";
import { IConstraintStore } from "../../document/ConstraintStore";
import { IEventMarkerStore } from "../../document/EventMarkerStore";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import { Commands } from "../../document/tauriCommands";
import CircularObstacleConfigPanel from "../config/CircularObstacleConfigPanel";
import ConstraintsConfigPanel from "../config/ConstraintsConfigPanel";
import ViewOptionsPanel from "../config/ViewOptionsPanel";
import WaypointVisibilityPanel from "../config/WaypointVisibilityPanel";
import EventMarkerConfigPanel from "../config/eventmarker/EventMarkerConfigPanel";
import styles from "./Field.module.css";
import FieldOverlayRoot from "./svg/FieldOverlayRoot";

type Props = object;

type State = object;

export class Field extends Component<Props, State> {
  render() {
    const selectedSidebar = doc.selectedSidebarItem;
    const activePath = doc.pathlist.activePath;
    const activePathUUID = doc.pathlist.activePathUUID;
    let indexIfWaypoint = -1;
    if (selectedSidebar !== undefined && "heading" in selectedSidebar) {
      indexIfWaypoint = activePath.path.waypoints.findIndex(
        (point: IHolonomicWaypointStore) =>
          point.uuid == (selectedSidebar as IHolonomicWaypointStore)?.uuid
      );
    }

    return (
      <div className={styles.Container}>
        <FieldOverlayRoot></FieldOverlayRoot>
        {selectedSidebar !== undefined &&
          "heading" in selectedSidebar &&
          indexIfWaypoint !== -1 && (
            <WaypointPanel
              waypoint={selectedSidebar as IHolonomicWaypointStore}
              index={indexIfWaypoint}
            ></WaypointPanel>
          )}
        {selectedSidebar !== undefined &&
          "from" in selectedSidebar &&
          activePath.path.constraints.find(
            (constraint) =>
              constraint.uuid == (selectedSidebar as IConstraintStore)!.uuid
          ) && (
            <ConstraintsConfigPanel
              constraint={selectedSidebar as IConstraintStore}
            ></ConstraintsConfigPanel>
          )}
        {selectedSidebar !== undefined &&
          "radius" in selectedSidebar &&
          activePath.path.obstacles.find(
            (obstacle) =>
              obstacle.uuid == (selectedSidebar as ICircularObstacleStore)!.uuid
          ) && (
            <CircularObstacleConfigPanel
              obstacle={selectedSidebar as ICircularObstacleStore}
            ></CircularObstacleConfigPanel>
          )}
        {selectedSidebar !== undefined &&
          "offset" in selectedSidebar &&
          activePath.traj.markers.find(
            (marker) =>
              marker.uuid == (selectedSidebar as IEventMarkerStore)!.uuid
          ) && (
            <EventMarkerConfigPanel
              marker={selectedSidebar as IEventMarkerStore}
            ></EventMarkerConfigPanel>
          )}
        <ViewOptionsPanel />
        <WaypointVisibilityPanel />
        <Tooltip
          disableInteractive
          placement="top-start"
          title={
            activePath.ui.generating
              ? "Cancel All"
              : activePath.canGenerate()
                ? "Generate Path"
                : "Generate Path (needs 2 waypoints)"
          }
        >
          <Box
            sx={{
              position: "absolute",
              bottom: 16,
              right: 16,
              width: 48,
              height: 48
            }}
          >
            {/* cancel button */}
            <IconButton
              aria-label="add"
              size="large"
              style={{ pointerEvents: "all" }}
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "100%",
                height: "100%",
                transformOrigin: "100% 100%",
                transform: "scale(1.3)",
                borderRadius: "50%",
                boxShadow: "3px",
                marginInline: 0,
                zIndex: activePath.ui.generating ? 10 : -1,
                backgroundColor: "red",
                "&:hover": {
                  backgroundColor: "darkred"
                }
              }}
              onClick={(event) => {
                Commands.cancel();
              }}
              disabled={activePath.canGenerate()}
            >
              <Close> </Close>
            </IconButton>
            <IconButton
              color="primary"
              aria-label="add"
              size="large"
              style={{ pointerEvents: "all" }}
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "100%",
                height: "100%",
                transformOrigin: "100% 100%",
                transform: "scale(1.3)",
                borderRadius: "50%",
                boxShadow: "3px",
                marginInline: 0,
                visibility: activePath.canGenerate() ? "visible" : "hidden"
              }}
              onClick={() => generateWithToastsAndExport(activePathUUID)}
              disabled={!activePath.canGenerate()}
            >
              <ShapeLineIcon></ShapeLineIcon>
            </IconButton>
          </Box>
        </Tooltip>
        {activePath.ui.generating && (
          <CircularProgress
            size={48 * 1.3}
            sx={{
              color: "var(--select-yellow)",
              position: "absolute",
              bottom: 16,
              right: 16
            }}
          />
        )}
      </div>
    );
  }
}

export default observer(Field);
