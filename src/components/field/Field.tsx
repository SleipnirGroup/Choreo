import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import WaypointPanel from "../sidebar/WaypointPanel";

import styles from "./Field.module.css";
import FieldOverlayRoot from "./svg/FieldOverlayRoot";
import IconButton from "@mui/material/IconButton";
import ShapeLineIcon from "@mui/icons-material/ShapeLine";
import { CircularProgress, Tooltip } from "@mui/material";
import Box from "@mui/material/Box/Box";

type Props = {};

type State = {};

export class Field extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  render() {
    return (
      <div className={styles.Container}>
        <FieldOverlayRoot></FieldOverlayRoot>
        <WaypointPanel
          waypoint={this.context.model.pathlist.activePath.lowestSelectedPoint()}
        ></WaypointPanel>
        <Tooltip
          placement="top-start"
          title={
            this.context.model.pathlist.activePath.canGenerate() ||
            this.context.model.pathlist.activePath.generating
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
                this.context.model.generatePath(
                  this.context.model.pathlist.activePathUUID
                );
              }}
              disabled={!this.context.model.pathlist.activePath.canGenerate()}
            >
              <ShapeLineIcon></ShapeLineIcon>
            </IconButton>
          </Box>
        </Tooltip>
        {this.context.model.pathlist.activePath.generating && (
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
