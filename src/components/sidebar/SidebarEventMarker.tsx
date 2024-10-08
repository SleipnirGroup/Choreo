import { Room } from "@mui/icons-material";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { getParent } from "mobx-state-tree";
import React, { Component } from "react";
import { WaypointUUID } from "../../document/2025/DocumentTypes";
import { doc } from "../../document/DocumentManager";
import { IEventMarkerStore } from "../../document/EventMarkerStore";
import {
  IHolonomicPathStore,
  waypointIDToText
} from "../../document/path/HolonomicPathStore";
import styles from "./Sidebar.module.css";

type Props = {
  marker: IEventMarkerStore;
};

type State = { selected: boolean };

class SidebarMarker extends Component<Props, State> {
  id: number = 0;
  state = { selected: false };
  waypointIDToText(id: WaypointUUID | undefined) {
    const points = getParent<IHolonomicPathStore>(
      getParent<IEventMarkerStore[]>(this.props.marker)
    ).params.waypoints;
    return waypointIDToText(id, points);
  }

  render() {
    const marker = this.props.marker;
    const selected = this.props.marker.selected;
    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          doc.setSelectedSidebarItem(marker);
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
          <Tooltip disableInteractive title={this.props.marker.data.name}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {this.props.marker.data.name}
            </span>
          </Tooltip>
          {/* {!isInSameSegment || marker.data.getTargetIndex() === undefined ? (
            <Tooltip disableInteractive title={issueTitle}>
              <PriorityHigh
                className={styles.SidebarIcon}
                style={{ color: "red" }}
              ></PriorityHigh>
            </Tooltip>
          ) : (
            <span></span>
          )} */}
          <span>
            <span>{this.waypointIDToText(this.props.marker.data.target)} </span>
            <span style={{}}>
              (
              {(this.props.marker.data.offset.value < 0 ? "" : "+") +
                this.props.marker.data.offset.value.toFixed(2) +
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
              doc.pathlist.activePath.deleteMarkerUUID(marker?.uuid || "");
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
