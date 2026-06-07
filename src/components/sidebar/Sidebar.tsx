import { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import { observer } from "mobx-react";
import styles from "./Sidebar.module.css";
import { Divider, IconButton, TextField, Tooltip } from "@mui/material";
import WaypointList from "./WaypointList";
import PathSelector from "./PathSelector";
import MenuIcon from "@mui/icons-material/Menu";
import {
  ContentCopy,
  Redo,
  ShapeLine,
  Polyline,
  Undo,
  Search,
  Clear,
  Abc
} from "@mui/icons-material";
import Add from "@mui/icons-material/Add";
import SidebarConstraint from "./SidebarConstraint";
import SidebarEventMarker from "./SidebarEventMarker";
import { IEventMarkerStore } from "../../document/EventMarkerStore";

import ProjectSaveStatusIndicator from "./ProjectSaveStatusIndicator";

type Props = object;
type State = object;

class TrajectorySearch extends Component<Props, State> {
  render() {
    const { trajSearchQuery, setTrajSearchQuery } = uiState;

    return (
      <div
        style={{
          position: "sticky",
          top: "-8px",
          zIndex: 10,
          backgroundColor: "var(--background-dark-gray)",
          paddingInline: "8px",
          paddingBottom: "8px",
          paddingTop: "8px"
        }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search paths..."
          value={trajSearchQuery}
          onChange={(e) => setTrajSearchQuery(e.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <Search
                  sx={{
                    color: "gray",
                    marginRight: "4px",
                    fontSize: "20px"
                  }}
                />
              ),
              endAdornment: (
                <>
                  <Tooltip
                    disableInteractive
                    title={
                      uiState.trajSearchRegex
                        ? "Disable regex search"
                        : "Enable regex search"
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={uiState.toggleTrajSearchRegex}
                      sx={{
                        borderRadius: "3px",
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: "bold",
                        lineHeight: 1,
                        color: uiState.trajSearchRegex
                          ? "var(--accent-purple)"
                          : "white",
                        border: uiState.trajSearchRegex
                          ? "1px solid var(--accent-purple)"
                          : "1px solid transparent"
                      }}
                    >
                      Re
                    </IconButton>
                  </Tooltip>
                  {trajSearchQuery && (
                    <IconButton
                      size="small"
                      onClick={() => setTrajSearchQuery("")}
                    >
                      <Clear sx={{ fontSize: "18px", color: "white" }} />
                    </IconButton>
                  )}
                </>
              ),
              style: {
                color: "white",
                backgroundColor: "var(--background-light-gray)",
                borderRadius: "4px",
                height: "32px",
                fontSize: "14px"
              }
            }
          }}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "transparent"
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--divider-gray)"
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--accent-purple)"
            }
          }}
        />
      </div>
    );
  }
}

class Sidebar extends Component<Props, State> {
  state = {};
  constructor(props: Props) {
    super(props);
  }

  startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener("mousemove", this.resize);
    document.addEventListener("mouseup", this.stopResize);
  };

  resize = (e: MouseEvent) => {
    const newWidth = Math.max(260, Math.min(560, e.clientX));
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${newWidth}px`
    );
  };

  stopResize = () => {
    document.removeEventListener("mousemove", this.resize);
    document.removeEventListener("mouseup", this.stopResize);
  };

  componentWillUnmount() {
    this.stopResize();
  }

  render() {
    return (
      <div className={styles.Container}>
        <div onMouseDown={this.startResize} className={styles.ResizeHandle} />
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
              <IconButton onClick={uiState.toggleMainMenu}>
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
          style={{
            gridTemplateColumns: "auto 33.6px 33.6px 33.6px 33.6px 33.6px"
          }}
        >
          PATHS
          <Tooltip disableInteractive title="Sort by Alphabetical Order">
            <span>
              <IconButton
                size="small"
                color="default"
                style={{ float: "right" }}
                sx={{
                  color: uiState.sortAlphabetical
                    ? "var(--accent-purple)"
                    : "white"
                }}
                onClick={uiState.toggleSortAlphabetical}
              >
                <Abc />
              </IconButton>
            </span>
          </Tooltip>
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
              onClick={() => doc.pathlist.addPath("NewPath", true)}
            >
              <Add fontSize="small"></Add>
            </IconButton>
          </Tooltip>
        </div>
        <Divider />
        <TrajectorySearch />
        <Divider />
        <div
          className={styles.Sidebar}
          style={{ maxHeight: "300px", minHeight: "50px" }}
        >
          <PathSelector
            searchQuery={uiState.trajSearchQuery ?? ""}
            regexMode={uiState.trajSearchRegex}
            sortAlphabetical={uiState.sortAlphabetical}
          ></PathSelector>
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
