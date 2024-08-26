import {
  Circle,
  CircleOutlined,
  CropFree,
  DoNotDisturb,
  Grid4x4,
  Room,
  Route,
  ScatterPlot,
  SquareOutlined
} from "@mui/icons-material";
import { ReactElement } from "react";
import Waypoint from "../assets/Waypoint";
import {
  ConstraintDefinition,
  ConstraintDefinitions,
  ConstraintKey
} from "./ConstraintDefinitions";
import { ConstraintStore } from "./ConstraintStore";

/* Navbar stuff */
export const WaypointData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = {
  FullWaypoint: {
    index: 0,
    name: "Pose Waypoint",
    icon: <Waypoint />
  },
  TranslationWaypoint: {
    index: 1,
    name: "Translation Waypoint",
    icon: <Circle />
  },
  EmptyWaypoint: {
    index: 2,
    name: "Empty Waypoint",
    icon: <CircleOutlined />
  }
};
export const NavbarData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = Object.assign({}, WaypointData);
const waypointNavbarCount = Object.keys(NavbarData).length;
const constraintsIndices: number[] = [];
export const navbarIndexToConstraint: {
  [key: number]: typeof ConstraintStore;
} = {};
export const navbarIndexToConstraintDefinition: {
  [key: number]: ConstraintDefinition<any>;
} = {};
export const navbarIndexToConstraintKey: {
  [key: number]: ConstraintKey;
} = {};
{
  let constraintsOffset = Object.keys(NavbarData).length;
  Object.entries(ConstraintDefinitions).forEach(([key, data], index) => {
    NavbarData[key] = {
      index: constraintsOffset,
      name: data.name,
      icon: data.icon
    };
    navbarIndexToConstraintDefinition[constraintsOffset] = data;
    navbarIndexToConstraintKey[constraintsOffset] = key as ConstraintKey;
    constraintsIndices.push(constraintsOffset);
    constraintsOffset++;
  });
}
const constraintNavbarCount = Object.keys(ConstraintDefinitions).length;
export const ObstacleData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = {
  CircleObstacle: {
    index: Object.keys(NavbarData).length,
    name: "Circular Obstacle",
    icon: <DoNotDisturb />
  }
};
let obstacleNavbarCount = 0;
obstacleNavbarCount = Object.keys(ObstacleData).length;
Object.entries(ObstacleData).forEach(([name, data]) => {
  const obstaclesOffset = Object.keys(NavbarData).length;
  NavbarData[name] = {
    index: obstaclesOffset,
    name: data.name,
    icon: data.icon
  };
});

const eventMarkerCount = 1;
NavbarData.EventMarker = {
  index: Object.keys(NavbarData).length,
  name: "Event Marker",
  icon: <Room></Room>
};

/** An map of  */
export const NavbarLabels = (() => {
  const x: { [key: string]: number } = {};
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[key] = index;
  });
  return x;
})();

/** An array of name-and-icon objects for the navbar */
export const NavbarItemData = (() => {
  const x: Array<{ name: string; icon: any }> = [];
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[data.index] = { name: data.name, icon: data.icon };
  });
  return x;
})();

const NavbarItemSections = [waypointNavbarCount, constraintNavbarCount];
NavbarItemSections.push(obstacleNavbarCount);
NavbarItemSections.push(eventMarkerCount);

export const NavbarItemSectionEnds = NavbarItemSections.map((s, idx) =>
  NavbarItemSections.slice(0, idx + 1).reduce((prev, cur) => prev + cur, -1)
);

/* ViewOptionsPanel items */
export const ViewData = {
  Field: {
    index: 0,
    name: "Field",
    icon: (
      <SquareOutlined style={{ transform: "scale(1.2, 0.6)" }}></SquareOutlined>
    ),
    default: true
  },
  Grid: {
    index: 1,
    name: "Grid",
    icon: <Grid4x4 />,
    default: false
  },
  Trajectory: {
    index: 2,
    name: "Trajectory",
    icon: <Route />,
    default: true
  },
  Samples: {
    index: 3,
    name: "Samples",
    icon: <ScatterPlot />,
    default: false
  },
  Waypoints: {
    index: 4,
    name: "Waypoints",
    icon: <Waypoint />,
    default: true
  },
  Obstacles: {
    index: 5,
    name: "Obstacles",
    icon: <DoNotDisturb />,
    default: true
  },
  Focus: {
    index: 6,
    name: "Focus",
    icon: <CropFree />,
    default: false
  }
};

export const ViewLayers = (() => {
  const x: { [key: string]: number } = {};
  Object.entries(ViewData).forEach(([key, data], index) => {
    x[key] = index;
  });
  return x;
})();

export const ViewItemData = (() => {
  const x: Array<{ name: string; icon: any; default: boolean }> = [];
  Object.entries(ViewData).forEach(([key, data], index) => {
    x[data.index] = { name: data.name, icon: data.icon, default: data.default };
  });
  return x;
})();
export const ViewLayerDefaults = ViewItemData.map((layer) => layer.default);
export type ViewLayerType = typeof ViewLayers;
export const NUM_SETTINGS_TABS = 4;
