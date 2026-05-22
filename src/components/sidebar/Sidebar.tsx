import { Component, useRef, useState } from "react";
import { doc, renamePath, uiState } from "../../document/DocumentManager";
import { observer } from "mobx-react";
import styles from "./Sidebar.module.css";
import { Divider, IconButton, Tooltip } from "@mui/material";
import WaypointList from "./WaypointList";
import { ArrowBack } from "@mui/icons-material";
import SidebarConstraint from "./SidebarConstraint";
import SidebarEventMarker from "./SidebarEventMarker";
import { IEventMarkerStore } from "../../document/EventMarkerStore";
import { NameIssue } from "../../document/path/NameIsIdentifier";
import ProjectSaveStatusIndicator from "./ProjectSaveStatusIndicator";

const PathNameEditor = observer(() => {
  const path = doc.pathlist.activePath;
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<NameIssue | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = () => {
    setName(path.name);
    setError(undefined);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    if (error === undefined && name !== path.name) {
      renamePath(path.uuid, name);
    }
    setRenaming(false);
  };

  const check = (n: string) => {
    setError(doc.pathlist.validateName(n, path.uuid));
    setName(n);
  };

  if (renaming) {
    return (
      <Tooltip
        disableInteractive
        open={error !== undefined}
        title={error?.uiMessage ?? ""}
        placement="bottom"
        arrow
      >
        <input
          ref={inputRef}
          value={name}
          autoFocus
          spellCheck={false}
          onChange={(e) => check(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setRenaming(false);
          }}
          onBlur={commit}
          className={styles.PathNameInput}
          style={{
            borderBottomColor: error ? "#f44336" : "var(--accent-purple)"
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip disableInteractive title="Click to rename">
      <span className={styles.PathNameDisplay} onClick={startRename}>
        <span className={styles.PathNameText}>{path.name}</span>
      </span>
    </Tooltip>
  );
});

type Props = object;

type State = object;

class Sidebar extends Component<Props, State> {
  state = {};
  constructor(props: Props) {
    super(props);
  }

  render() {
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
          <span style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <Tooltip disableInteractive title="All Paths">
              <IconButton onClick={() => uiState.navigateToHome()}>
                <ArrowBack></ArrowBack>
              </IconButton>
            </Tooltip>
            <PathNameEditor />
          </span>

          <span>
            <ProjectSaveStatusIndicator
              savingState={uiState.projectSavingState}
            ></ProjectSaveStatusIndicator>
          </span>
        </div>
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
              (marker: IEventMarkerStore) => {
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
