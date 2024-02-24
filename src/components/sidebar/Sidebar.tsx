import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { observer } from "mobx-react";
import styles from "./Sidebar.module.css";
import { Divider, IconButton, Tooltip } from "@mui/material";
import WaypointList from "./WaypointList";
import PathSelector from "./PathSelector";
import MenuIcon from "@mui/icons-material/Menu";
import { ContentCopy, Redo, Undo } from "@mui/icons-material";
import Add from "@mui/icons-material/Add";
import SidebarConstraint from "./SidebarConstraint";
import SidebarObstacle from "./SidebarObstacle";
import { ICircularObstacleStore } from "../../document/CircularObstacleStore";

type Props = object;

type State = object;

class Sidebar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  constructor(props: Props) {
    super(props);
  }

  render() {
    const { toggleMainMenu } = this.context.model.uiState;
    return (
      <div className={styles.Container}>
        <div
          style={{
            flexShrink: 0,
            height: "var(--top-nav-height)",
            borderBottom: "thin solid var(--divider-gray)",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingLeft: 0,
            zIndex: 1000
          }}
        >
          <span>
            <Tooltip disableInteractive title="Main Menu">
              <IconButton
                onClick={() => {
                  toggleMainMenu();
                }}
              >
                <MenuIcon></MenuIcon>
              </IconButton>
            </Tooltip>
            Choreo
          </span>
          <span>
            <Tooltip disableInteractive title="Undo">
              <span>
                <IconButton
                  disabled={!this.context.history.canUndo}
                  onClick={() => {
                    this.context.undo();
                  }}
                >
                  <Undo></Undo>
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip disableInteractive title="Redo">
              <span>
                <IconButton
                  disabled={!this.context.history.canRedo}
                  onClick={() => {
                    this.context.redo();
                  }}
                >
                  <Redo></Redo>
                </IconButton>
              </span>
            </Tooltip>
          </span>
        </div>
        <div
          className={styles.SidebarHeading}
          style={{ gridTemplateColumns: "auto 33.6px 33.6px" }}
        >
          PATHS
          <Tooltip disableInteractive title="Duplicate Path">
            <IconButton
              size="small"
              color="default"
              style={{
                float: "right"
              }}
              disabled={
                Object.keys(this.context.model.document.pathlist.paths)
                  .length == 0
              }
              onClick={() =>
                this.context.model.document.pathlist.duplicatePath(
                  this.context.model.document.pathlist.activePathUUID
                )
              }
            >
              <ContentCopy fontSize="small"></ContentCopy>
            </IconButton>
          </Tooltip>
          <Tooltip disableInteractive title="Add Path">
            <IconButton
              size="small"
              color="default"
              style={{
                float: "right"
              }}
              onClick={() =>
                this.context.model.document.pathlist.addPath("New Path", true)
              }
            >
              <Add fontSize="small"></Add>
            </IconButton>
          </Tooltip>
        </div>
        <Divider></Divider>
        <div
          className={styles.Sidebar}
          style={{ maxHeight: "300px", minHeight: "50px" }}
        >
          <PathSelector></PathSelector>
        </div>
        <Divider></Divider>
        <div className={styles.SidebarHeading}>FEATURES</div>
        <Divider flexItem></Divider>
        <div className={styles.Sidebar}>
          <Divider className={styles.SidebarDivider} textAlign="left" flexItem>
            <span>WAYPOINTS</span>
          </Divider>

          <WaypointList></WaypointList>
          <Divider className={styles.SidebarDivider} textAlign="left" flexItem>
            <span>CONSTRAINTS</span>
          </Divider>
          <div className={styles.WaypointList}>
            {this.context.model.document.pathlist.activePath.constraints.map(
              (constraint) => {
                return (
                  <SidebarConstraint
                    key={constraint.uuid}
                    constraint={constraint}
                  ></SidebarConstraint>
                );
              }
            )}
          </div>
          {this.context.model.document.pathlist.activePath.constraints.length ==
            0 && (
            <div className={styles.SidebarItem + " " + styles.Noninteractible}>
              <span></span>
              <span style={{ color: "gray", fontStyle: "italic" }}>
                No Constraints
              </span>
            </div>
          )}
          {(this.context.model.document.usesObstacles ||
            this.context.model.document.pathlist.activePath.obstacles.includes(
              this.context.model.uiState.selectedSidebarItem
            )) && (
            <>
              <Divider
                className={styles.SidebarDivider}
                textAlign="left"
                flexItem
              >
                <span>OBSTACLES</span>
              </Divider>
              <div className={styles.WaypointList}>
                {this.context.model.document.pathlist.activePath.obstacles.map(
                  (obstacle: ICircularObstacleStore, index: number) => {
                    return (
                      <SidebarObstacle
                        obstacle={obstacle}
                        index={index}
                        context={this.context}
                      ></SidebarObstacle>
                    );
                  }
                )}
              </div>
              {this.context.model.document.pathlist.activePath.obstacles
                .length == 0 && (
                <div
                  className={styles.SidebarItem + " " + styles.Noninteractible}
                >
                  <span></span>
                  <span style={{ color: "gray", fontStyle: "italic" }}>
                    No Obstacles
                  </span>
                </div>
              )}
              <Divider></Divider>
            </>
          )}
        </div>
      </div>
    );
  }
}
export default observer(Sidebar);
