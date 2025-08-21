import { Project } from "../document/2025/DocumentTypes";
import { writeConst } from "./internals";

export function genConstsFile(project: Project, packageName: string): string {
  const out: string[] = [];
  out.push(`package ${packageName};`);
  out.push(`
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.units.measure.*;
import static edu.wpi.first.units.Units.*;

/**
 * Generated file containing document settings for your Choreo project.
 * This allows for modifying constants in choreo while keeping your robot code up-to-date.
 * DO NOT MODIFY this file yourself, as it is auto-generated.
 */
public final class ChoreoConsts {`);

  const config = project.config;
  const maxLinearVel =
    (config.vmax.val / config.gearing.val) * config.radius.val;
  const maxWheelForce =
    (config.tmax.val * config.gearing.val * 4) / config.radius.val;
  const maxLinearAccel = maxWheelForce / config.mass.val;

  out.push(writeConst(config.gearing, "gearing", "Number"));
  out.push(writeConst(config.cof, "frictionCoefficient", "Number"));
  out.push(writeConst(config.radius, "wheelRadius", "Length"));
  out.push(writeConst(config.inertia, "moi", "MoI"));
  out.push(writeConst(config.mass, "mass", "Mass"));
  out.push(writeConst(config.tmax, "driveMotorMaxTorque", "Torque"));

  const bumperWB = config.bumper.front.val + config.bumper.back.val;
  const bumperTW = config.bumper.side.val * 2;
  out.push(writeConst(bumperWB, "wheelBaseWithBumpers", "Length"));
  out.push(writeConst(bumperTW, "trackWidthWithBumpers", "Length"));

  if (project.type === "Swerve") {
    out.push(`
    public static final Translation2d[] moduleTranslations = {
        new Translation2d(${config.frontLeft.x.val}, ${config.frontLeft.y.val}),
        new Translation2d(${config.frontLeft.x.val}, ${-config.frontLeft.y.val}),
        new Translation2d(${config.backLeft.x.val}, ${config.backLeft.y.val}),
        new Translation2d(${config.backLeft.x.val}, ${-config.backLeft.y.val}),
    };`);
    const drivebaseRadius = Math.hypot(
      config.frontLeft.x.val,
      config.frontLeft.y.val
    );
    const frictionFloorForce = config.mass.val * 9.81 * config.cof.val;
    const minLinearForce = Math.min(frictionFloorForce, maxWheelForce);
    const maxAngularVel = maxLinearVel / drivebaseRadius;
    const maxAngularAccel =
      (minLinearForce * drivebaseRadius) / config.inertia.val;
    out.push(writeConst(maxAngularVel, "maxAngularVel", "AngVel"));
    out.push(writeConst(maxAngularAccel, "maxAngularAccel", "AngAcc"));
  } else {
    out.push(writeConst(config.differentialTrackWidth, "trackWidth", "Length"));
    out.push("");
  }
  out.push(writeConst(maxLinearVel, "maxLinearVel", "LinVel"));
  out.push(writeConst(maxLinearAccel, "maxLinearAccel", "LinAcc"));
  out.push("");
  out.push("    private ChoreoConsts() {}");
  out.push("}");
  return out.join("\n");
}
