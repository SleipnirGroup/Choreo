import { IconButton, Tooltip } from "@mui/material";
import { observer } from "mobx-react";

import React, { Component } from "react";
import { IConstraintStore, WaypointID } from "../../document/ConstraintStore";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";
import DeleteIcon from "@mui/icons-material/Delete";
import { getParent } from "mobx-state-tree";
import { IHolonomicPathStore } from "../../document/HolonomicPathStore";
import { PriorityHigh } from "@mui/icons-material";

type Props = {
  constraint: IConstraintStore;
};

type State = object;

class SidebarConstraint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  id: number = 0;
  state = {};

  getScopeText() {
    const waypointIDToText = (id: WaypointID) => {
      if (id == "first") return "Start";
      if (id == "last") return "End";
      return (
        getParent<IHolonomicPathStore>(
          getParent<IConstraintStore[]>(this.props.constraint)
        ).findUUIDIndex(id.uuid) + 1
      );
    };
    const scope = this.props.constraint.getSortedScope();
    if (scope.length == 0) return "!";
    else if (
      scope.length == 1 ||
      scope[0] === scope[1] ||
      (Object.hasOwn(scope[0], "uuid") &&
        Object.hasOwn(scope[1], "uuid") &&
        scope[0]!.uuid == scope[1]!.uuid)
    )
      return waypointIDToText(scope[0]);
    else {
      return `${waypointIDToText(scope[0])}-${waypointIDToText(scope[1])}`;
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
          this.context.model.uiState.setSelectedSidebarItem(
            this.props.constraint
          );
        }}
      >
        {React.cloneElement(this.props.constraint.definition.icon, {
          className: styles.SidebarIcon,
          htmlColor: selected ? "var(--select-yellow)" : "var(--accent-purple)"
        })}
        {/* className={styles.SidebarIcon}
          htmlColor={selected ? "var(--select-yellow)" : "var(--accent-purple)"}
        ></Icon> */}
        <span
          className={styles.SidebarLabel}
          style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}
        >
          <span>{this.props.constraint.definition.shortName}</span>
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
        <Tooltip disableInteractive title="Delete Constraint">
          <IconButton
            className={styles.SidebarRightIcon}
            onClick={(e) => {
              e.stopPropagation();
              this.context.model.document.pathlist.activePath.deleteConstraintUUID(
                this.props.constraint?.uuid || ""
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
export default observer(SidebarConstraint);
