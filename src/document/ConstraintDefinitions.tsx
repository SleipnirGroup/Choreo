import {
  ArrowCircleDown,
  DoNotDisturb,
  NearMe,
  StopCircleOutlined,
  SyncOutlined,
  SystemUpdateAlt
} from "@mui/icons-material";
import { JSXElementConstructor, ReactElement } from "react";
import { Expr } from "./2025/DocumentTypes";
import { Dimension, DimensionName, Dimensions } from "./ExpressionStore";

export type ConstraintPropertyType = Expr | boolean;

export type ConstraintPropertyDefinition<P extends ConstraintPropertyType> = {
  name: string;
  description: string;
  defaultVal: P;
} & (P extends Expr ? { dimension: Dimension<DimensionName> } : object);

export type DataPropsList = { [key: string]: ConstraintPropertyType };
export type PropertyDefinitionList<P extends DataPropsList> = {
  [key in keyof P]: ConstraintPropertyDefinition<P[key]>;
};
export type ConstraintDefinition<
  K extends ConstraintKey,
  D extends ConstraintData = DataMap[K]
> = {
  type: D["type"];
  name: string;
  shortName: string;
  icon: ReactElement<any, string | JSXElementConstructor<any>>;
  description: string;
  wptScope: boolean;
  sgmtScope: boolean;
  properties: PropertyDefinitionList<D["props"]>;
};

export type WaypointID = "first" | "last" | { uuid: string };

// Constraints
interface IConstraintData<name, Props extends DataPropsList> {
  readonly type: name;
  props: Props;
}

export type ConstraintDataTypeMap = {
  // Record<string,never> broke the keyof operator
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  StopPoint: {};
  MaxVelocity: { max: Expr };
  MaxAcceleration: { max: Expr };
  MaxAngularVelocity: { max: Expr };
  PointAt: {
    x: Expr;
    y: Expr;
    tolerance: Expr;
    flip: boolean;
  };
  KeepInCircle: {
    x: Expr;
    y: Expr;
    r: Expr;
  };
  KeepInRectangle: {
    x: Expr;
    y: Expr;
    w: Expr;
    h: Expr;
  };
  KeepOutCircle: {
    x: Expr;
    y: Expr;
    r: Expr;
  };
};
export type DataMap = {
  [K in keyof ConstraintDataTypeMap]: IConstraintData<
    K,
    ConstraintDataTypeMap[K]
  >;
};
export type ConstraintData = DataMap[keyof DataMap];

type defs = { [K in ConstraintKey]: ConstraintDefinition<K> };
export const ConstraintDefinitions: defs = {
  StopPoint: {
    type: "StopPoint" as const,
    name: "Stop Point",
    shortName: "Stop",
    description: "Zero linear and angular velocity at waypoint",
    icon: <StopCircleOutlined />,
    properties: {},
    wptScope: true,
    sgmtScope: false
  } satisfies ConstraintDefinition<"StopPoint">,
  MaxVelocity: {
    type: "MaxVelocity" as const,
    name: "Max Velocity",
    shortName: "Max Velo",
    description: "Maximum Velocity",
    icon: Dimensions.LinVel.icon(),
    properties: {
      max: {
        name: "Max Velocity",
        description: "Maximum linear velocity of robot chassis",
        dimension: Dimensions.LinVel,
        defaultVal: { exp: "0 m/s", val: 0 }
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"MaxVelocity">,
  MaxAcceleration: {
    type: "MaxAcceleration" as const,
    name: "Max Acceleration",
    shortName: "Max Acc",
    description: "Maximum Linear Acceleration",
    icon: Dimensions.LinAcc.icon(),
    properties: {
      max: {
        name: "Max Acceleration",
        description: "Maximum Linear Acceleration of robot chassis",
        dimension: Dimensions.LinAcc,
        defaultVal: { exp: "10 m/s^2", val: 0 }
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"MaxAcceleration">,
  MaxAngularVelocity: {
    type: "MaxAngularVelocity" as const,
    name: "Max Angular Velocity",
    shortName: "Max Ang Vel",
    description: "Maximum Angular Velocity",
    icon: <SyncOutlined />,
    properties: {
      max: {
        name: "Max Angular Velocity",
        description: "Maximum Angular Velocity of robot chassis",
        dimension: Dimensions.AngVel,
        defaultVal: { exp: "0 rad/s", val: 0 }
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"MaxAngularVelocity">,
  PointAt: {
    type: "PointAt" as const,
    name: "Point At",
    shortName: "Point At",
    description: "Face a specified point",
    icon: <NearMe />,
    properties: {
      x: {
        name: "X",
        description: "The x coordinate of the point the robot should face",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      y: {
        name: "Y",
        description: "The y coordinate of the point the robot should face",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      tolerance: {
        name: "θ Tol.",
        description:
          "The allowable heading range relative to the direction to the point. Keep less than Pi.",
        dimension: Dimensions.Angle,
        defaultVal: { exp: "1 deg", val: Math.PI / 180.0 }
      },
      flip: {
        name: "Flip",
        description:
          "Whether to point the back of the robot at the point instead of the front",
        defaultVal: false
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"PointAt">,
  KeepInCircle: {
    type: "KeepInCircle" as const,
    name: "Keep In Circle",
    shortName: "Keep In Circle",
    description: "Keep the robot's bumpers within a circular region",
    icon: <ArrowCircleDown />,
    properties: {
      x: {
        name: "X",
        description: "The x coordinate of the center of the keep in zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      y: {
        name: "Y",
        description: "The y coordinate of the center of the keep in zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      r: {
        name: "R",
        description: "The radius of the keep in zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "1 m", val: 1 }
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"KeepInCircle">,
  KeepInRectangle: {
    type: "KeepInRectangle" as const,
    name: "Keep In Rectangle",
    shortName: "Keep In Rect",
    description: "Keep the robot's bumpers within a rectangular region",
    icon: <SystemUpdateAlt />,
    properties: {
      x: {
        name: "X",
        description: "The x coordinate of the bottom left of the keep in zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      y: {
        name: "Y",
        description: "The y coordinate of the bottom left of the keep in zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      w: {
        name: "W",
        description: "The width of the keep in zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "1 m", val: 1 }
      },
      h: {
        name: "H",
        description: "The height of the keep in zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "1 m", val: 1 }
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"KeepInRectangle">,
  KeepOutCircle: {
    type: "KeepOutCircle" as const,
    name: "Keep Out Circle",
    shortName: "Keep Out Circle",
    description: "Keep the robot's bumpers outside of a circular region",
    icon: <DoNotDisturb />,
    properties: {
      x: {
        name: "X",
        description: "The x coordinate of the center of the keep out zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      y: {
        name: "Y",
        description: "The y coordinate of the center of the keep out zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "0 m", val: 0 }
      },
      r: {
        name: "R",
        description: "The radius of the keep out zone",
        dimension: Dimensions.Length,
        defaultVal: { exp: "1 m", val: 1 }
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"KeepOutCircle">
};

export type ConstraintKey = keyof DataMap;
export const consts = Object.values(ConstraintDefinitions);
