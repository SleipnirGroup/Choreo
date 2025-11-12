import { DimensionName } from "../document/ExpressionStore";
import { Expr, Variable } from "../document/2025/DocumentTypes";

export interface UnitData {
  type: string;
  baseUnit: string;
}

export function unitDataFrom(
  choreoDimensionName: DimensionName
): UnitData | null {
  switch (choreoDimensionName) {
    case "LinAcc":
      return {
        type: "LinearAcceleration",
        baseUnit: "MetersPerSecondPerSecond"
      };
    case "LinVel":
      return { type: "LinearVelocity", baseUnit: "MetersPerSecond" };
    case "Length":
      return { type: "Distance", baseUnit: "Meters" };
    case "Angle":
      return { type: "Angle", baseUnit: "Radians" };
    case "AngVel":
      return { type: "AngularVelocity", baseUnit: "RadiansPerSecond" };
    case "AngAcc":
      return {
        type: "AngularAcceleration",
        baseUnit: "RadiansPerSecondPerSecond"
      };
    case "Time":
      return { type: "Time", baseUnit: "Seconds" };
    case "Mass":
      return { type: "Mass", baseUnit: "Kilograms" };
    case "Torque":
      return { type: "Torque", baseUnit: "NewtonMeters" };
    case "MoI":
      return { type: "MomentOfInertia", baseUnit: "KilogramSquareMeters" };
    default:
      return null;
  }
}

export function writeConst(
  expr: Expr | number,
  variableName: string,
  dimension: DimensionName
): string {
  variableName = variableName.replace(/\b(\w)/g, (char) => char.toLowerCase());
  const unitData = unitDataFrom(dimension);
  let val = typeof expr === "number" ? expr : expr.val;
  val = round(val, dimension === "MoI" ? 5 : 3);
  if (!dimension || !unitData) {
    return `    public static final double ${variableName} = ${val};`;
  }
  return `    public static final ${unitData.type} ${variableName} = ${unitData.baseUnit}.of(${val});`;
}

export function round(val: number, digits: number) {
  const roundingFactor = Math.pow(10, digits);
  return Math.round(val * roundingFactor) / roundingFactor;
}
