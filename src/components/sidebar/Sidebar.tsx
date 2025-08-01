import { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import { observer } from "mobx-react";
import styles from "./Sidebar.module.css";
import { Divider, IconButton, Tooltip } from "@mui/material";
import WaypointList from "./WaypointList";
import PathSelector from "./PathSelector";
import MenuIcon from "@mui/icons-material/Menu";
import {
  ContentCopy,
  Redo,
  ShapeLine,
  Polyline,
  Undo
} from "@mui/icons-material";
import Add from "@mui/icons-material/Add";
import SidebarConstraint from "./SidebarConstraint";
import SidebarEventMarker from "./SidebarEventMarker";
import { IEventMarkerStore } from "../../document/EventMarkerStore";

import ProjectSaveStatusIndicator from "./ProjectSaveStatusIndicator";

type Props = object;

type State = object;

class Sidebar extends Component<Props, State> {
  state = {};
  constructor(props: Props) {
    super(props);
  }

  render() {
    const { toggleMainMenu } = uiState;
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
            <ProjectSaveStatusIndicator
              savingState={uiState.projectSavingState}
            ></ProjectSaveStatusIndicator>
            <Tooltip disableInteractive title="Undo">
              <span>
                <IconButton
                  disabled={!doc.history.canUndo}
                  onClick={() => {
                    doc.undo();
                  }}
                >
                  <Undo></Undo>
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip disableInteractive title="Redo">
              <span>
                <IconButton
                  disabled={!doc.history.canRedo}
                  onClick={() => {
                    doc.redo();
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
          style={{ gridTemplateColumns: "auto 33.6px 33.6px 33.6px 33.6px" }}
        >
          PATHS
          <Tooltip disableInteractive title="Generate All">
            <span>
              <IconButton
                size="small"
                color="default"
                style={{
                  float: "right"
                }}
                disabled={Object.keys(doc.pathlist.paths).length == 0}
                onClick={() => doc.generateAll()}
              >
                <Polyline fontSize="small"></Polyline>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip disableInteractive title="Generate All Outdated">
            <span>
              <IconButton
                size="small"
                color="default"
                style={{
                  float: "right"
                }}
                disabled={Object.keys(doc.pathlist.paths).length == 0}
                onClick={() => doc.generateAllOutdated()}
              >
                <ShapeLine fontSize="small"></ShapeLine>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip disableInteractive title="Duplicate Path">
            <span>
              <IconButton
                size="small"
                color="default"
                style={{
                  float: "right"
                }}
                disabled={Object.keys(doc.pathlist.paths).length == 0}
                onClick={() =>
                  doc.pathlist.duplicatePath(doc.pathlist.activePathUUID)
                }
              >
                <ContentCopy fontSize="small"></ContentCopy>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip disableInteractive title="Add Path">
            <IconButton
              size="small"
              color="default"
              style={{
                float: "right"
              }}
              onClick={() => doc.pathlist.addPath("New Path", true)}
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
            {doc.pathlist.activePath.params.constraints.map((constraint) => {
              return (
                <SidebarConstraint
                  path={doc.pathlist.activePath}
                  key={constraint.uuid}
                  constraint={constraint}
                ></SidebarConstraint>
              );
            })}
          </div>
          {doc.pathlist.activePath.params.constraints.length == 0 && (
            <div className={styles.SidebarItem + " " + styles.Noninteractible}>
              <span></span>
              <span style={{ color: "gray", fontStyle: "italic" }}>
                No Constraints
              </span>
            </div>
          )}
          <Divider className={styles.SidebarDivider} textAlign="left" flexItem>
            <span>MARKERS</span>
          </Divider>
          <div className={styles.WaypointList}>
            {doc.pathlist.activePath.markers.map(
              (marker: IEventMarkerStore, index: number) => {
                return (
                  <SidebarEventMarker
                    marker={marker}
                    key={marker.uuid}
                  ></SidebarEventMarker>
                );
              }
            )}
          </div>
          {doc.pathlist.activePath.markers.length == 0 && (
            <div className={styles.SidebarItem + " " + styles.Noninteractible}>
              <span></span>
              <span style={{ color: "gray", fontStyle: "italic" }}>
                No Event Markers
              </span>
            </div>
          )}
          <Divider></Divider>
        </div>
      </div>
    );
  }
}
export default observer(Sidebar);
