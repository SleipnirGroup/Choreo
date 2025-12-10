import { DimensionName } from "../document/ExpressionStore";
import { Expr, Project } from "../document/schema/DocumentTypes";

export const VARS_FILENAME = "ChoreoVars";

// Generates a Java file containing variables defined in the Choreo GUI.
export function genVarsFile(project: Project, packageName: string): string {
  const content: string[] = [];
  content.push(`package ${packageName};`);
  content.push(`
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.units.measure.*;

import static edu.wpi.first.units.Units.*;

/**
 * Generated file containing variables defined in Choreo.
 * DO NOT MODIFY THIS FILE YOURSELF; instead, change these values
 * in the Choreo GUI.
 */
public final class ${VARS_FILENAME} {`);
  for (const [varName, data] of Object.entries(project.variables.expressions)) {
    content.push(asVariable(data.var, varName, data.dimension));
  }
  content.push("");
  const poseEntries = Object.entries(project.variables.poses);
  if (poseEntries.length > 0) {
    content.push("    public static final class Poses {");
    for (const [varName, pose] of poseEntries) {
      const heading =
        Math.abs(pose.heading.val) < 1e-5
          ? "Rotation2d.kZero"
          : `Rotation2d.fromRadians(${round(pose.heading.val, 3)})`;
      const x = round(pose.x.val, 3);
      const y = round(pose.y.val, 3);
      content.push(
        `        public static final Pose2d ${varName} = new Pose2d(${x}, ${y}, ${heading});`
      );
    }
    content.push("");
    content.push("        private Poses() {}");
    content.push("    }");
    content.push("");
  }
  content.push(`    private ${VARS_FILENAME}() {}`);
  content.push("}");
  return content.join("\n");
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

const javaUnitData = {

    "Number": null,
    "LinAcc": {
        type: "LinearAcceleration",
        baseUnit: "MetersPerSecondPerSecond"
      },
    "LinVel": { type: "LinearVelocity", baseUnit: "MetersPerSecond" },
    "Length": { type: "Distance", baseUnit: "Meters" },
    "Angle": { type: "Angle", baseUnit: "Radians" },
    "AngVel": { type: "AngularVelocity", baseUnit: "RadiansPerSecond" },
    "AngAcc": {
        type: "AngularAcceleration",
        baseUnit: "RadiansPerSecondPerSecond"
      },
    "Time": { type: "Time", baseUnit: "Seconds" },
    "Mass": { type: "Mass", baseUnit: "Kilograms" },
    "Torque": { type: "Torque", baseUnit: "NewtonMeters" },
    "MoI": { type: "MomentOfInertia", baseUnit: "KilogramSquareMeters" }
} as const satisfies {[D in DimensionName]: {type: string, baseUnit: string} | null};
// Transforms choreo unit dimensions into WPILib dimensions, as well as their default units.
function unitDataFrom(
  choreoDimensionName: DimensionName
): { type: string; baseUnit: string } | null {
  return javaUnitData[choreoDimensionName];
}

function round(val: number, digits: number) {
  const roundingFactor = Math.pow(10, digits);
  return Math.round(val * roundingFactor) / roundingFactor;
}
