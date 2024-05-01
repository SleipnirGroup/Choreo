package frc.robot;

import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;

public final class Constants {
    private final static double TAU = 2 * Math.PI;

    // all measurements are in meters unless otherwise specified
    // all angles are in radians unless otherwise specified
    @SuppressWarnings("unused")
    public static final class Conv {
        public static final double FEET_TO_METERS = 0.3048;
        public static final double INCHES_TO_METERS = 0.0254;
        public static final double DEGREES_TO_RADIANS = Math.PI / 180.0;
        public static final double ROTATIONS_TO_RADIANTS = TAU;
        public static final double RPM_TO_RADIANS_PER_SECOND = TAU / 60.0;
    }

    @SuppressWarnings("unused")
    public static final class Motors {
        private static final class Falcon500 {
            public static final double FREE_SPEED = 668.1;
            public static final double FREE_CURRENT = 1.5;
            public static final double STALL_TORQUE = 4.69;
            public static final double STALL_CURRENT = 257.0;
        }

        private static final class Falcon500Foc {
            public static final double FREE_SPEED = 636.7;
            public static final double FREE_CURRENT = 1.5;
            public static final double STALL_TORQUE = 5.84;
            public static final double STALL_CURRENT = 304.0;
        }

        public static final class KrakenX60Foc {
            public static final double FREE_SPEED = 608.0;
            public static final double FREE_CURRENT = 2.0;
            public static final double STALL_TORQUE = 9.37;
            public static final double STALL_CURRENT = 483.0;
        }
    }

    public static final double PERIODIC_TIME = 0.02; // 20ms

    public static final class kRobotGeometry {
        public static final double BUMPER_THICKNESS = 2.8 * Conv.INCHES_TO_METERS;
        public static final double BUMPER_HEIGHT = 5.75 * Conv.INCHES_TO_METERS;
        public static final double FRAME_WIDTH = 26.0 * Conv.INCHES_TO_METERS;
        public static final double INTAKE_EXTENSION = 5.0 * Conv.INCHES_TO_METERS;
    }

    public static final class kFieldConstants {
        public static final double FIELD_LENGTH = 54.4 * Conv.FEET_TO_METERS;
        public static final double FIELD_WIDTH = 26.9 * Conv.FEET_TO_METERS;

        public static final Translation3d SPEAKER = new Translation3d(
            0.0331,
            5.547868,
            2.08
        );
    }

    public static final class kControls {
        public static final double SHOOTER_RPM = 6500.0;
        public static final double AUTO_SHOOTER_RPM = 8000.0;
        public static final double SHOOTER_IDLE_RPM = 2000.0;
        public static final double INTAKE_VOLTS = -9.0;
    }

    public static final class kSwerve {
        /**
         * The gear ratios for the swerve modules for easier constant definition.
         */
        @SuppressWarnings("unused")
        private static final class SwerveGearRatios {
            static final double L1_DRIVE = 8.14;
            static final double L2_DRIVE = (50.0 / 14.0) * (17.0 / 27.0) * (45.0 / 15.0);
            static final double L3_DRIVE = (50.0 / 14.0) * (16.0 / 28.0) * (45.0 / 15.0);
            static final double L3_DRIVE_KRAKEN = (50.0 / 16.0) * (16.0 / 28.0) * (45.0 / 15.0);
            static final double L4_DRIVE = 5.14;

            static final double ANGLE = 150.0 / 7.0;
        }

        /* Drivetrain Constants */
        public static final double TRACK_WIDTH = 0.551942;
        public static final double WHEEL_DIAMETER = 4.0 * Conv.INCHES_TO_METERS;
        public static final double WHEEL_CIRCUMFERENCE = WHEEL_DIAMETER * Math.PI;
        // public static final double DRIVEBASE_RADIUS = Math.sqrt(Math.pow(TRACK_WIDTH
        // / 2.0, 2) + Math.pow(WHEEL_BASE / 2.0, 2));
        public static final double DRIVEBASE_RADIUS = 0.39;
        public static final double DRIVEBASE_CIRCUMFERENCE = DRIVEBASE_RADIUS * TAU;

        public static final double ANGLE_GEAR_RATIO = SwerveGearRatios.ANGLE;

        public static final double DRIVE_GEAR_RATIO = SwerveGearRatios.L3_DRIVE_KRAKEN;

        /**
         * Not every motor can output the max speed at all times, add a buffer to make
         * closed loop more accurate
         */
        public static final double MOTOR_CLOSED_LOOP_OUTPUT_SCALAR = 0.95;

        /** User defined acceleration time in seconds */
        public static final double ACCELERATION_TIME = 0.9;

        public static final double SLIP_CURRENT = 50.0;

        public static final double MAX_DRIVE_VELOCITY = ((Motors.KrakenX60Foc.FREE_SPEED / TAU) / DRIVE_GEAR_RATIO)
                * WHEEL_CIRCUMFERENCE * MOTOR_CLOSED_LOOP_OUTPUT_SCALAR;
        public static final double MAX_DRIVE_ACCELERATION = MAX_DRIVE_VELOCITY / ACCELERATION_TIME;

        public static final double MAX_ANGULAR_VELOCITY = MAX_DRIVE_VELOCITY / DRIVEBASE_RADIUS;
        public static final double MAX_ANGULAR_ACCELERATION = MAX_ANGULAR_VELOCITY / ACCELERATION_TIME;

        public static final double MAX_STEERING_VELOCITY = Motors.Falcon500Foc.FREE_SPEED
                / (ANGLE_GEAR_RATIO * MOTOR_CLOSED_LOOP_OUTPUT_SCALAR);

        public static final class kDriveMotor {
            public static final double kP = 0.27;
            public static final double kI = 0.0;
            public static final double kD = 0.0;

            public static final double kS = 0.15;
            public static final double kV = 0.0;
        }

        public static final class kAngleMotor {
            public static final double kP = 11.0;
            public static final double kI = 0.0;
            public static final double kD = 0.0;
        }

        public static final class kRotationController {
            public static final double kP = 8.0;
            public static final double kD = 0.2;

            public static final double DEADBAND = 0.5 * Conv.DEGREES_TO_RADIANS;
            public static final double CONSTRAINT_SCALAR = 0.7;
        }

        public static final class kMod0 {
            public static final Translation2d CHASSIS_OFFSET = new Translation2d(
                TRACK_WIDTH / 2.0,
                -TRACK_WIDTH / 2.0
            );
        }

        public static final class kMod1 {
            public static final Translation2d CHASSIS_OFFSET = new Translation2d(
                -TRACK_WIDTH / 2.0,
                -TRACK_WIDTH / 2.0
            );
        }

        public static final class kMod2 {
            public static final Translation2d CHASSIS_OFFSET = new Translation2d(
                -TRACK_WIDTH / 2.0,
                TRACK_WIDTH / 2.0
            );
        }

        public static final class kMod3 {
            public static final Translation2d CHASSIS_OFFSET = new Translation2d(
                TRACK_WIDTH / 2.0,
                TRACK_WIDTH / 2.0
            );
        }

        public static final Translation2d[] MODULE_CHASSIS_OFFSETS = new Translation2d[] {
                kMod0.CHASSIS_OFFSET,
                kMod1.CHASSIS_OFFSET,
                kMod2.CHASSIS_OFFSET,
                kMod3.CHASSIS_OFFSET
        };

        public static final SwerveDriveKinematics SWERVE_KINEMATICS = new SwerveDriveKinematics(
                MODULE_CHASSIS_OFFSETS);
    }

    public static final class kAuto {
        public static final PIDController AUTO_TRANSLATION_PID = new PIDController(3.4, 0, 0.0, PERIODIC_TIME);
        public static final PIDController AUTO_ANGULAR_PID = new PIDController(3.0, 0.0, 0.0, PERIODIC_TIME);
    }

    public static final class kShooter {
        public static final double MOTOR_kP = 0.15;
        public static final double MOTOR_kI = 0.0;
        public static final double MOTOR_kD = 0.00;
        public static final double MOTOR_kS = 0.15;
        public static final double MOTOR_kV = 0.118;

        public static final double MECHANISM_RATIO = 1.5;
        public static final double WHEEL_DIAMETER = 4.0;

        public static final double DEFAULT_TOLERANCE = 0.03;

        public static final double MAX_SHOOT_SPEED = 8000.0 * Conv.RPM_TO_RADIANS_PER_SECOND;
    }
}
