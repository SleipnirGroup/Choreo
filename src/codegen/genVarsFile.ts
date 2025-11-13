import { Project } from "../document/2025/DocumentTypes";
import { round, writeConst } from "./internals";

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
 * DO NOT MODIFY THIS YOURSELF; instead, change these values
 * in the choreo GUI.
 */
public final class ChoreoVars {`);
  for (const [varName, data] of Object.entries(project.variables.expressions)) {
    out.push(writeConst(data.var, varName, data.dimension));
  }
  out.push("");
  out.push("    public static final class Poses {");
  for (const [varName, pose] of Object.entries(project.variables.poses)) {
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
  out.push("    private ChoreoVars() {}");
  out.push("}");
  return out.join("\n");
}
