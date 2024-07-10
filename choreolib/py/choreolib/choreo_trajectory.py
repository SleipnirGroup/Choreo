from __future__ import annotations
import math

from wpimath.geometry import Pose2d, Rotation2d
from wpimath.kinematics import ChassisSpeeds


def lerp(a, b, t) -> float:
    return a + (b - a) * t


class ChoreoTrajectoryState:
    def __init__(
        self,
        timestamp: float,
        x: float,
        y: float,
        heading: float,
        velocity_x: float,
        velocity_y: float,
        angular_velocity: float,
        module_forces_x: list[float],
        module_forces_y: list[float],
    ):
        """
        Constructs a ChoreoTrajectoryState with the specified parameters.

        Parameter ``timestamp``:
            The timestamp of this state, relative to the beginning of the
            trajectory.

        Parameter ``x``:
            The X position of the state in meters.

        Parameter ``y``:
            The Y position of the state in meters.

        Parameter ``heading``:
            The heading of the state in radians, with 0 being in the +X
            direction.

        Parameter ``velocity_x``:
            The velocity of the state in the X direction in m/s.

        Parameter ``velocity_y``:
            The velocity of the state in the Y direction in m/s.

        Parameter ``angular_velocity``:
            The angular velocity of the state in rad/s.

        Parameter ``module_forces_x``:
            The force on the swerve modules in the X direction in Newtons.

        Parameter ``module_forces_y``:
            The force on the swerve modules in the Y direction in Netwons.
        """
        self.timestamp = timestamp
        self.x = x
        self.y = y
        self.heading = heading
        self.velocity_x = velocity_x
        self.velocity_y = velocity_y
        self.angular_velocity = angular_velocity
        self.module_forces_x = module_forces_x
        self.module_forces_y = module_forces_y

    def get_pose(self) -> Pose2d:
        """
        Returns the pose at this state.
        """
        return Pose2d(self.x, self.y, Rotation2d(value=self.heading))

    def get_chassis_speeds(self) -> ChassisSpeeds:
        """
        Returns the field-relative chassis speeds of this state.
        """
        return ChassisSpeeds(self.velocity_x, self.velocity_y, self.angular_velocity)

    def interpolate(
        self, end_value: ChoreoTrajectoryState, t: float
    ) -> ChoreoTrajectoryState:
        """
        Interpolate between this state and the provided state.

        Parameter ``end_value``:
            The next state. It should have a timestamp after this state.

        Parameter ``t``:
            The timestamp of the interpolated state. It should be between this
            state and end_value.

        Returns:
            The interpolated state.
        """
        scale = (t - self.timestamp) / (end_value.timestamp - self.timestamp)

        return ChoreoTrajectoryState(
            t,
            lerp(self.x, end_value.x, scale),
            lerp(self.y, end_value.y, scale),
            lerp(self.heading, end_value.heading, scale),
            lerp(self.velocity_x, end_value.velocity_x, scale),
            lerp(self.velocity_y, end_value.velocity_y, scale),
            lerp(self.angular_velocity, end_value.angular_velocity, scale),
            [
                lerp(self.module_forces_x[i], end_value.module_forces_x[i], scale)
                for i in range(len(self.module_forces_x))
            ],
            [
                lerp(self.module_forces_y[i], end_value.module_forces_y[i], scale)
                for i in range(len(self.module_forces_y))
            ],
        )

    def flipped(self):
        """
        Returns this state, mirrored across the field midline.
        """
        return ChoreoTrajectoryState(
            self.timestamp,
            16.55445 - self.x,
            self.y,
            math.pi - self.heading,
            -self.velocity_x,
            self.velocity_y,
            -self.angular_velocity,
            [-x for x in self.module_forces_x],
            self.module_forces_y,
        )


class ChoreoTrajectory:
    def __init__(self, samples: list[ChoreoTrajectoryState]):
        """
        Constructs a new trajectory from a list of trajectory states

        Parameter ``samples``:
            A vector containing a list of ChoreoTrajectoryStates.
        """
        self.samples = samples

    def __sample_internal(self, timestamp) -> ChoreoTrajectoryState:
        # Handle timestamps outside the trajectory range
        if timestamp < self.samples[0].timestamp:
            return self.samples[0]
        if timestamp > self.get_total_time():
            return self.samples[-1]

        # Binary search to find the two states on either side of the requested timestamps
        low = 0
        high = len(self.samples) - 1
        while low != high:
            mid = math.floor((low + high) / 2)
            if self.samples[mid].timestamp < timestamp:
                low = mid + 1
            else:
                high = mid

        # Handle case near start of trajectory
        if low == 0:
            return self.samples[0]

        # Find the states on either side of the requested time
        behind_state = self.samples[low - 1]
        ahead_state = self.samples[low]

        if ahead_state.timestamp - behind_state.timestamp < 1e-6:
            # meh states are so close, just give back one of them
            return ahead_state

        # Perform the actual interpolation
        return behind_state.interpolate(ahead_state, timestamp)

    def sample(
        self, timestamp: float, mirror_for_red_alliance: bool = False
    ) -> ChoreoTrajectoryState:
        """
        Return an interpolated sample of the trajectory at the given timestamp.

        Parameter ``timestamp``:
            The timestamp of this sample relative to the beginning of the
            trajectory.

        Parameter ``mirror_for_red_alliance``:
            Whether or not to return the sample as mirrored across the field
            midline (as in 2023).

        Returns:
            The ChoreoTrajectoryState at the given time.
        """
        tmp = self.__sample_internal(timestamp)

        return tmp.flipped() if mirror_for_red_alliance else tmp

    def get_samples(self) -> list[ChoreoTrajectoryState]:
        """
        Returns the list of states for this trajectory.
        """
        return self.samples

    def get_initial_pose(self) -> Pose2d:
        """
        Returns the initial, non-mirrored pose of the trajectory.
        """
        return self.samples[0].get_pose()

    def get_flipped_initial_pose(self) -> Pose2d:
        """
        Returns the initial, mirrored pose of the trajectory.
        """
        return self.samples[0].flipped().get_pose()

    def get_final_pose(self) -> Pose2d:
        """
        Returns the final, non-mirrored pose of the trajectory.
        """
        return self.samples[-1].get_pose()

    def get_flipped_final_pose(self) -> Pose2d:
        """
        Returns the final, mirrored pose of the trajectory.
        """
        return self.samples[-1].flipped().get_pose()

    def get_total_time(self) -> float:
        """
        Returns the total time of the trajectory (the timestamp of the last
        sample).
        """
        return self.samples[-1].timestamp

    def get_poses(self) -> list[Pose2d]:
        """
        Returns the array of poses corresponding to the trajectory.
        """
        return [x.get_pose() for x in self.samples]

    def flipped(self) -> ChoreoTrajectory:
        """
        Returns this trajectory, mirrored across the field midline.
        """
        return ChoreoTrajectory([x.flipped() for x in self.samples])
