import { observer } from "mobx-react";
import { Component } from "react";
import {
  doc} from "../../document/DocumentManager";
import WaypointPanel from "../config/WaypointConfigPanel";

import { CircularProgress } from "@mui/material";
import { IConstraintStore } from "../../document/ConstraintStore";
import { IEventMarkerStore } from "../../document/EventMarkerStore";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import ConstraintsConfigPanel from "../config/ConstraintsConfigPanel";
import ViewOptionsPanel from "../config/ViewOptionsPanel";
import WaypointVisibilityPanel from "../config/WaypointVisibilityPanel";
import EventMarkerConfigPanel from "../config/eventmarker/EventMarkerConfigPanel";
import styles from "./Field.module.css";
import FieldOverlayRoot from "./svg/FieldOverlayRoot";
import GenerationButton from "./GenerationButton";

type Props = object;

type State = object;

export class Field extends Component<Props, State> {
  render() {
    const selectedSidebar = doc.selectedSidebarItem;
    const activePath = doc.pathlist.activePath;
    const activePathUUID = doc.pathlist.activePathUUID;
    if (
      activePathUUID === doc.pathlist.defaultPath!.uuid ||
      activePath === undefined
    ) {
      return <></>;
    }
    let indexIfWaypoint = -1;
    if (selectedSidebar !== undefined && "heading" in selectedSidebar) {
      indexIfWaypoint = activePath.params.waypoints.findIndex(
        (point: IHolonomicWaypointStore) =>
          point.uuid == (selectedSidebar as IHolonomicWaypointStore)?.uuid
      );
    }

    return (
      <div className={styles.Container}>
        <FieldOverlayRoot></FieldOverlayRoot>
        {selectedSidebar !== undefined &&
          "heading" in selectedSidebar &&
          indexIfWaypoint !== -1 && (
            <WaypointPanel
              waypoint={selectedSidebar as IHolonomicWaypointStore}
              index={indexIfWaypoint}
            ></WaypointPanel>
          )}
        {selectedSidebar !== undefined &&
          "from" in selectedSidebar &&
          activePath.params.constraints.find(
            (constraint) =>
              constraint.uuid == (selectedSidebar as IConstraintStore)!.uuid
          ) && (
            <ConstraintsConfigPanel
              points={activePath.params.waypoints}
              constraint={selectedSidebar as IConstraintStore}
            ></ConstraintsConfigPanel>
          )}
        {selectedSidebar !== undefined &&
          "event" in selectedSidebar &&
          activePath.markers.find(
            (marker) =>
              marker.uuid == (selectedSidebar as IEventMarkerStore)!.uuid
          ) && (
            <EventMarkerConfigPanel
              points={activePath.params.waypoints}
              marker={selectedSidebar as IEventMarkerStore}
            ></EventMarkerConfigPanel>
          )}

        <ViewOptionsPanel />
        <WaypointVisibilityPanel />
        <GenerationButton></GenerationButton>

      </div>
    );
  }
}

export default observer(Field);
