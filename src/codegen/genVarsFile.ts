import { DimensionName } from "../document/ExpressionStore";
import { Expr, Project } from "../document/schema/DocumentTypes";

// Generates a Java file containing variables defined in the choreo GUI.
export function genVarsFile(project: Project, packageName: string): string {
  const out: string[] = [];
  out.push(`package ${packageName};`);
  out.push(`
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.units.measure.*;

import static edu.wpi.first.units.Units.*;

/**
 * Generated file containing variables defined in Choreo.
 * DO NOT MODIFY THIS FILE YOURSELF; instead, change these values
 * in the choreo GUI.
 */
public final class ChoreoVars {`);
  for (const [varName, data] of Object.entries(project.variables.expressions)) {
    out.push(asVariable(data.var, varName, data.dimension));
  }
  out.push("");
  const poseEntries = Object.entries(project.variables.poses);
  if (poseEntries.length > 0) {
    out.push("    public static final class Poses {");
    for (const [varName, pose] of poseEntries) {
      const heading =
        Math.abs(pose.heading.val) < 1e-5
          ? "Rotation2d.kZero"
          : `Rotation2d.fromRadians(${round(pose.heading.val, 3)})`;
      const x = round(pose.x.val, 3);
      const y = round(pose.y.val, 3);
      out.push(
        `        public static final Pose2d ${varName} = new Pose2d(${x}, ${y}, ${heading});`
      );
    }
    out.push("");
    out.push("        private Poses() {}");
    out.push("    }");
    out.push("");
  }
  out.push("    private ChoreoVars() {}");
  out.push("}");
  return out.join("\n");
}

// Generates a Java variable declaration for a given expression.
function asVariable(
  expr: Expr | number,
  variableName: string,
  dimension: DimensionName
): string {
  const unitData = unitDataFrom(dimension);
  let val = typeof expr === "number" ? expr : expr.val;
  val = round(val, dimension === "MoI" ? 5 : 3);
  if (!dimension || !unitData) {
    return `    public static final double ${variableName} = ${val};`;
  }
  return `    public static final ${unitData.type} ${variableName} = ${unitData.baseUnit}.of(${val});`;
}

// Transforms choreo unit dimensions into WPILib dimensions, as well as their default units.
function unitDataFrom(
  choreoDimensionName: DimensionName
): { type: string; baseUnit: string } | null {
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

function round(val: number, digits: number) {
  const roundingFactor = Math.pow(10, digits);
  return Math.round(val * roundingFactor) / roundingFactor;
}
