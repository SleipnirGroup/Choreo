// Copyright (c) Choreo contributors

package choreo.trajectory;

import java.util.List;

/** A representation of a project file aka a .chor. */
public class ProjectFile {
  /** A representation of an expression. An equation and its value. */
  public static class Expression {
    /** The equation. */
    public final String exp;

    /** The value. */
    public final double val;

    Expression(String exp, double val) {
      this.exp = exp;
      this.val = val;
    }
  }

  /** An xy pair of expressions. */
  public static class XYExpression {
    /** The x expression. */
    public final Expression x;

    /** The y expression. */
    public final Expression y;

    XYExpression(Expression x, Expression y) {
      this.x = x;
      this.y = y;
    }
  }

  /**
   * A collection of expressions representing the distance of the bumpers from the center of the
   * robot.
   */
  public static class Bumpers {
    /** The front bumper expression. */
    public final Expression front;

    /** The back bumper expression. */
    public final Expression back;

    /** The side bumper expression. */
    public final Expression side;

    Bumpers(Expression front, Expression back, Expression side) {
      this.front = front;
      this.back = back;
      this.side = side;
    }
  }

  /** The user configuration of the project. */
  public static class Config {
    /** The position of the front left module */
    public final XYExpression frontLeft;

    /** The position of the back left module */
    public final XYExpression backLeft;

    /** The mass of the robot. (kg) */
    public final Expression mass;

    /** The inertia of the robot. (kg-m^2) */
    public final Expression inertia;

    /** The gearing of the robot. */
    public final Expression gearing;

    /** The radius of the wheel. (m) */
    public final Expression wheelRadius;

    /** The maximum velocity of the robot. (m/s) */
    public final Expression vmax;

    /** The maximum torque of the robot. (N-m) */
    public final Expression tmax;

    /** The bumpers of the robot. */
    public final Bumpers bumper;

    /** The width between the wheels of the robot. (m) */
    public final Expression differentialTrackWidth;

    Config(
        XYExpression frontLeft,
        XYExpression backLeft,
        Expression mass,
        Expression inertia,
        Expression gearing,
        Expression wheelRadius,
        Expression vmax,
        Expression tmax,
        Bumpers bumper,
        Expression differentialTrackWidth) {
      this.frontLeft = frontLeft;
      this.backLeft = backLeft;
      this.mass = mass;
      this.inertia = inertia;
      this.gearing = gearing;
      this.wheelRadius = wheelRadius;
      this.vmax = vmax;
      this.tmax = tmax;
      this.bumper = bumper;
      this.differentialTrackWidth = differentialTrackWidth;
    }
  }

  /** The name of the project. */
  public final String name;

  /** The version of the project. */
  public final String version;

  /** The sample type for the project */
  public final String type;

  /** The configuration of the project. */
  public final Config config;

  /** The generation features of the project. */
  public final List<String> generationFeatures;

  ProjectFile(
      String name, String version, String type, Config config, List<String> generationFeatures) {
    this.name = name;
    this.version = version;
    this.type = type;
    this.config = config;
    this.generationFeatures = generationFeatures;
  }
}
