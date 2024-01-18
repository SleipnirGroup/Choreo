import { Component } from "react";
import React from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";
import { observer } from "mobx-react";
import DeleteIcon from "@mui/icons-material/Delete";
import { DoNotDisturb } from "@mui/icons-material";
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

  waypointIDToText (id: WaypointID) {
    if (id == "first") return "Start";
    if (id == "last") return "End";
    return (
      getParent<IHolonomicPathStore>(
        getParent<IEventMarkerStore[]>(this.props.marker)
      ).findUUIDIndex(id.uuid) + 1
    );
  };

  render() {
    let marker = this.props.marker;
    let selected = this.props.marker.selected;
    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          this.context.model.uiState.setSelectedSidebarItem(marker);
        }}
      >
        {React.cloneElement(<DoNotDisturb></DoNotDisturb>, {
          className: styles.SidebarIcon,
          htmlColor: this.state.selected
            ? "var(--select-yellow)"
            : "var(--accent-purple)",
        })}
        <span
          className={styles.SidebarLabel}
          style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}
        >
          {this.waypointIDToText(this.props.marker.target) + "+" + this.props.marker.offset.toFixed(2)}
        </span>
        <Tooltip disableInteractive title="Delete Obstacle">
          <IconButton
            className={styles.SidebarRightIcon}
            onClick={(e) => {
              e.stopPropagation();
            //   this.context.model.document.pathlist.activePath.deleteMarkerUUID(
            //     marker?.uuid || ""
            //   );
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
