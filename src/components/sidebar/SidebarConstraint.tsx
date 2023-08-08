import Settings from "@mui/icons-material/Settings";
import { IconButton, Tooltip } from "@mui/material";
import { observer } from "mobx-react";

import React, { Component } from "react";
import { constraints, IConstraintStore, ISegmentScope, WaypointID } from "../../document/ConstraintStore";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";
import DeleteIcon from "@mui/icons-material/Delete";
import { getParent } from "mobx-state-tree";
import { IHolonomicPathStore } from "../../document/HolonomicPathStore";

type Props = {
  constraint: IConstraintStore;
};

type State = {};

class SidebarConstraint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  id: number = 0;
  state = {};
  getScopeText() {
    let waypointIDToText = (id: WaypointID) =>{
      if (id == "first") return "Start";
      if (id == "last") return "End";
      return getParent<IHolonomicPathStore>(getParent<IConstraintStore[]>(this.props.constraint)).findUUIDIndex(id.uuid) + 1
    }
    let scope = this.props.constraint.scope;
    if (scope === null) return "!";
    else if (scope == "first") return "Start";
    else if (scope == "last") return "End";
    else if ("uuid" in scope && typeof scope.uuid == "string") {
      return getParent<IHolonomicPathStore>(getParent<IConstraintStore[]>(this.props.constraint)).findUUIDIndex(scope.uuid) + 1
    }
    else {
      let sgmtScope = scope as ISegmentScope;
      return `${waypointIDToText(sgmtScope.start)}-${waypointIDToText(sgmtScope.end)}`
    }
    

    
  }
  render() {
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    let selected = this.props.constraint.selected;
    let Icon = this.props.constraint.definition.icon;
    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          this.context.model.uiState.setSelectedSidebarItem(
            this.props.constraint
          );
        }}
      >
        {React.cloneElement(
        this.props.constraint.definition.icon, {
          className:styles.SidebarIcon,
          htmlColor: selected ? "var(--select-yellow)" : "var(--accent-purple)"
        })}
          {/* className={styles.SidebarIcon}
          htmlColor={selected ? "var(--select-yellow)" : "var(--accent-purple)"}
        ></Icon> */}
        <span className={styles.SidebarLabel} style={{display:"flex", justifyContent:"space-between"}}>
          <span>{this.props.constraint.definition.shortName}</span>
          <span>{`(${this.getScopeText()})`}</span>
        </span>
        <Tooltip title="Delete Constraint">
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
