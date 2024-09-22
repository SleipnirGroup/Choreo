import { IconButton, Tooltip } from "@mui/material";
import { observer } from "mobx-react";

import DeleteIcon from "@mui/icons-material/Delete";
import { Instance, getParent } from "mobx-state-tree";
import React, { Component } from "react";
import { IConstraintStore } from "../../document/ConstraintStore";
import { doc } from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";

import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  PriorityHigh
} from "@mui/icons-material";
import { ChoreoPathStore } from "../../document/path/ChoreoPathStore";
import { WaypointID } from "../../document/ConstraintDefinitions";

type Props = {
  constraint: IConstraintStore;
};

type State = object;

class SidebarConstraint extends Component<Props, State> {
  id: number = 0;
  state = {};

  getScopeText() {
    const waypointIDToText = (id: WaypointID) => {
      if (id == "first") return "Start";
      if (id == "last") return "End";
      return (
        getParent<Instance<typeof ChoreoPathStore>>(
          getParent<IConstraintStore[]>(this.props.constraint)
        ).findUUIDIndex(id.uuid) + 1
      );
    };
    const from = this.props.constraint.from;
    const to = this.props.constraint.to;
    if (from === undefined && to === undefined) return "!";
    else if (
      to === undefined || // wpt constraint
      from === to || //first-first, last-last
      (typeof from === "object" &&
        Object.hasOwn(from, "uuid") &&
        typeof to === "object" &&
        Object.hasOwn(to, "uuid") &&
        from!.uuid == to!.uuid) // zero-length segment
    )
      return waypointIDToText(from);
    else if (from === "first" && to === "last") return "All";
    else {
      return `${waypointIDToText(from)}-${waypointIDToText(to)}`;
    }
  }
  render() {
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    const selected = this.props.constraint.selected;
    const issues = this.props.constraint.issues;

    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          doc.setSelectedSidebarItem(this.props.constraint);
        }}
        onMouseOver={() => {
          doc.setHoveredSidebarItem(this.props.constraint);
        }}
        onMouseLeave={() => {
          doc.setHoveredSidebarItem(undefined);
        }}
      >
        {React.cloneElement(this.props.constraint.data.def.icon, {
          className: styles.SidebarIcon,
          htmlColor: selected
            ? "var(--select-yellow)"
            : this.props.constraint.enabled
              ? "var(--accent-purple)"
              : "gray"
        })}
        <span
          className={styles.SidebarLabel}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            color: this.props.constraint.enabled ? "white" : "gray"
          }}
        >
          <span>{this.props.constraint.data.def.shortName}</span>
          {issues.length !== 0 ? (
            <Tooltip disableInteractive title={issues.join(", ")}>
              <PriorityHigh
                className={styles.SidebarIcon}
                style={{ color: "red" }}
              ></PriorityHigh>
            </Tooltip>
          ) : (
            <span></span>
          )}

          {this.getScopeText()}
        </span>
        <span>
          <Tooltip disableInteractive title="Toggle Constraint">
            <IconButton
              className={styles.SidebarRightIcon}
              onClick={(e) => {
                e.stopPropagation();
                this.props.constraint.setEnabled(
                  !this.props.constraint.enabled
                );
              }}
            >
              {this.props.constraint.enabled && <CheckBoxOutlined />}
              {!this.props.constraint.enabled && (
                <CheckBoxOutlineBlankOutlined />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip disableInteractive title="Delete Constraint">
            <IconButton
              className={styles.SidebarRightIcon}
              onClick={(e) => {
                e.stopPropagation();
                doc.pathlist.activePath.params.deleteConstraint(
                  this.props.constraint?.uuid || ""
                );
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </span>
      </div>
    );
  }
}
export default observer(SidebarConstraint);
