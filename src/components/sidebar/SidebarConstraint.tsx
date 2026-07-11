import { IconButton, Tooltip } from "@mui/material";
import { observer } from "mobx-react";

import DeleteIcon from "@mui/icons-material/Delete";
import React, { Component } from "react";
import { IConstraintStore } from "../../document/ConstraintStore";
import { doc } from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";

import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  PriorityHigh
} from "@mui/icons-material";
import {
  IHolonomicPathStore,
  waypointIDToText
} from "../../document/path/HolonomicPathStore";

type Props = {
  constraint: IConstraintStore;
  path: IHolonomicPathStore;
};

type State = object;

class SidebarConstraint extends Component<Props, State> {
  id: number = 0;
  state = {};

  getScopeText() {
    const constraint = this.props.constraint;
    const points = this.props.path.params.waypoints;
    const from = constraint.from;
    const to = constraint.to;
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
      return waypointIDToText(from, points);
    else if (from === "first" && to === "last") return "All";
    else {
      return `${waypointIDToText(from, points)}-${waypointIDToText(to, points)}`;
    }
  }
  render() {
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes

    const { constraint, path } = this.props;
    const points = path.params.waypoints;
    const selected = constraint.selected;
    const issues = constraint.issues(points);

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
        {React.cloneElement(constraint.data.def.icon, {
          className: styles.SidebarIcon,
          htmlColor: selected
            ? "var(--select-yellow)"
            : constraint.enabled
              ? "var(--accent-purple)"
              : "gray"
        })}
        <span
          className={styles.SidebarLabel}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            color: constraint.enabled ? "white" : "gray"
          }}
        >
          <span>{constraint.data.def.shortName}</span>
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
                constraint.setEnabled(!constraint.enabled);
              }}
            >
              {constraint.enabled && <CheckBoxOutlined />}
              {!constraint.enabled && <CheckBoxOutlineBlankOutlined />}
            </IconButton>
          </Tooltip>
          <Tooltip disableInteractive title="Delete Constraint">
            <IconButton
              className={styles.SidebarRightIcon}
              onClick={(e) => {
                e.stopPropagation();
                path.params.deleteConstraint(constraint?.uuid || "");
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
