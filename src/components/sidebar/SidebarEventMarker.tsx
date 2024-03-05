import { Component } from "react";
import React from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";
import { observer } from "mobx-react";
import DeleteIcon from "@mui/icons-material/Delete";
import { PriorityHigh, Room } from "@mui/icons-material";
import { Tooltip, IconButton } from "@mui/material";
import { IEventMarkerStore } from "../../document/EventMarkerStore";
import { getParent } from "mobx-state-tree";
import { IHolonomicPathStore } from "../../document/HolonomicPathStore";
import { WaypointID } from "../../document/ConstraintStore";

type Props = {
  marker: IEventMarkerStore;
  index: number;
  context: React.ContextType<typeof DocumentManagerContext>;
};

type State = { selected: boolean };

class SidebarMarker extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  id: number = 0;
  state = { selected: false };

  waypointIDToText(id: WaypointID) {
    if (id == "first") return "Start";
    if (id == "last") return "End";
    return (
      getParent<IHolonomicPathStore>(
        getParent<IEventMarkerStore[]>(this.props.marker)
      ).findUUIDIndex(id.uuid) + 1
    );
  }

  render() {
    const marker = this.props.marker;
    const selected = this.props.marker.selected;
    const isInSameSegment = marker.isInSameSegment();
    const targetMissing = marker.getTargetIndex() === undefined;
    let issueTitle: string;
    if (targetMissing) {
      issueTitle = "Marker targets missing waypoint! Select a new target.";
    } else {
      if (isInSameSegment === undefined) {
        issueTitle =
          "Marker added since last generation. Marker will not show or export.";
      } else {
        issueTitle =
          "Stop point between targeted waypoint and actual time! Marker will not export.";
      }
    }
    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          this.context.model.uiState.setSelectedSidebarItem(marker);
        }}
      >
        {React.cloneElement(<Room></Room>, {
          className: styles.SidebarIcon,
          htmlColor: selected ? "var(--select-yellow)" : "var(--accent-purple)"
        })}
        <span
          className={styles.SidebarLabel}
          style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}
        >
          <Tooltip disableInteractive title={this.props.marker.name}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {this.props.marker.name}
            </span>
          </Tooltip>
          {!isInSameSegment || marker.getTargetIndex() === undefined ? (
            <Tooltip disableInteractive title={issueTitle}>
              <PriorityHigh
                className={styles.SidebarIcon}
                style={{ color: "red" }}
              ></PriorityHigh>
            </Tooltip>
          ) : (
            <span></span>
          )}
          <span>
            <span>
              {targetMissing
                ? "?"
                : this.waypointIDToText(this.props.marker.target)}{" "}
            </span>
            <span style={{}}>
              (
              {(this.props.marker.offset < 0 ? "" : "+") +
                this.props.marker.offset.toFixed(2) +
                " s"}
              )
            </span>
          </span>
        </span>
        <Tooltip disableInteractive title="Delete Marker">
          <IconButton
            className={styles.SidebarRightIcon}
            onClick={(e) => {
              e.stopPropagation();
              this.context.model.document.pathlist.activePath.deleteMarkerUUID(
                marker?.uuid || ""
              );
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
    );
  }
}
export default observer(SidebarMarker);
