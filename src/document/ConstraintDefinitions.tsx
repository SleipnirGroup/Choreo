import {
  KeyboardDoubleArrowRight,
  NearMe,
  StopCircleOutlined,
  TextRotationNoneOutlined
} from "@mui/icons-material";
import { Unit } from "mathjs";
import { JSXElementConstructor, ReactElement } from "react";
import { ObjectTyped } from "../util/ObjectTyped";
import { Expr } from "./2025/DocumentTypes";
import { Units } from "./ExpressionStore";

export type ConstraintPropertyType = Expr | boolean;

export type ConstraintPropertyDefinition<P extends ConstraintPropertyType> = {
  name: string;
  description: string;
  defaultVal: P;
} & (P extends Expr ? { units: Unit } : object);

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
  StopPoint: Record<string, never>;
  MaxVelocity: { max: Expr };
  MaxAcceleration: { max: Expr };
  PointAt: {
    x: Expr;
    y: Expr;
    tolerance: Expr;
    flip: boolean;
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
    icon: <KeyboardDoubleArrowRight />,
    properties: {
      max: {
        name: "Max Velocity",
        description: "Maximum linear velocity of robot chassis",
        units: Units.MeterPerSecond,
        defaultVal: ["0 m/s", 0]
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
    icon: <TextRotationNoneOutlined />,
    properties: {
      max: {
        name: "Max Acceleration",
        description: "Maximum Linear Acceleration of robot chassis",
        units: Units.MeterPerSecondSquared,
        defaultVal: ["10 m/s^2", 10]
      }
    },
    wptScope: true,
    sgmtScope: true
  } satisfies ConstraintDefinition<"MaxAcceleration">,
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
        units: Units.Meter,
        defaultVal: ["0 m", 0]
      },
      y: {
        name: "Y",
        description: "The y coordinate of the point the robot should face",
        units: Units.Meter,
        defaultVal: ["0 m", 0]
      },
      tolerance: {
        name: "Heading Tolerance",
        description:
          "The allowable heading range relative to the direction to the point. Keep less than Pi.",
        units: Units.Radian,
        defaultVal: ["1 deg", Math.PI / 180.0]
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
  } satisfies ConstraintDefinition<"PointAt">
};

export type ConstraintKey = keyof DataMap;
export const consts = ObjectTyped.values(ConstraintDefinitions);
