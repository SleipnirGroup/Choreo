import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import WaypointPanel from "../config/WaypointConfigPanel";

import styles from "./Field.module.css";
import FieldOverlayRoot from "./svg/FieldOverlayRoot";
import IconButton from "@mui/material/IconButton";
import ShapeLineIcon from "@mui/icons-material/ShapeLine";
import { CircularProgress, Tooltip } from "@mui/material";
import Box from "@mui/material/Box/Box";
import RobotConfigPanel from "../config/RobotConfigPanel";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import VisibilityPanel from "../config/VisibilityPanel";

type Props = {};

type State = {};

export class Field extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  // @ts-ignore
  context!: React.ContextType<typeof DocumentManagerContext>;
  render() {
    let robotConfigOpen = this.context.model.robotConfig.selected;
    let selectedSidebar = this.context.model.uiState.selectedSidebarItem;
    let activePath = this.context.model.pathlist.activePath;
    let activePathUUID = this.context.model.pathlist.activePathUUID;
    console.log("config", robotConfigOpen);
    return (
      <div className={styles.Container}>
        <FieldOverlayRoot></FieldOverlayRoot>
        {selectedSidebar !== undefined &&
          "heading" in selectedSidebar &&
          activePath.waypoints.find(
            (point) =>
              point.uuid == (selectedSidebar as IHolonomicWaypointStore)!.uuid
          ) && (
            <WaypointPanel
              waypoint={selectedSidebar as IHolonomicWaypointStore}
            ></WaypointPanel>
          )}
        {robotConfigOpen && (
          <div className={styles.WaypointPanel}>
            <RobotConfigPanel></RobotConfigPanel>
          </div>
        )}
        <VisibilityPanel></VisibilityPanel>
        <Tooltip
          placement="top-start"
          title={
            activePath.canGenerate() || activePath.generating
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
              height: 48,
            }}
          >
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
              }}
              onClick={() => {
                this.context.model.generatePath(activePathUUID);
              }}
              disabled={!activePath.canGenerate()}
            >
              <ShapeLineIcon></ShapeLineIcon>
            </IconButton>
          </Box>
        </Tooltip>
        {activePath.generating && (
          <CircularProgress
            size={48 * 1.3}
            sx={{
              color: "var(--select-yellow)",
              position: "absolute",
              bottom: 16,
              right: 16,
            }}
          />
        )}
      </div>
    );
  }
}

export default observer(Field);
