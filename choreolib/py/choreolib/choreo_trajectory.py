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
    ):
        self.timestamp = timestamp
        self.x = x
        self.y = y
        self.heading = heading
        self.velocity_x = velocity_x
        self.velocity_y = velocity_y
        self.angular_velocity = angular_velocity

    def get_pose(self) -> Pose2d:
        return Pose2d(self.x, self.y, Rotation2d(value=self.heading))

    def get_chassis_speeds(self) -> ChassisSpeeds:
        return ChassisSpeeds(self.velocity_x, self.velocity_y, self.angular_velocity)

    def interpolate(
        self, end_value: ChoreoTrajectoryState, t: float
    ) -> ChoreoTrajectoryState:
        scale = (t - self.timestamp) / (end_value.timestamp - self.timestamp)

        return ChoreoTrajectoryState(
            t,
            lerp(self.x, end_value.x, scale),
            lerp(self.y, end_value.y, scale),
            lerp(self.heading, end_value.heading, scale),
            lerp(self.velocity_x, end_value.velocity_x, scale),
            lerp(self.velocity_y, end_value.velocity_y, scale),
            lerp(self.angular_velocity, end_value.angular_velocity, scale),
        )

    def flipped(self):
        return ChoreoTrajectoryState(
            self.timestamp,
            16.55445 - self.x,
            self.y,
            math.pi - self.heading,
            -self.velocity_x,
            self.velocity_y,
            -self.angular_velocity,
        )


class ChoreoTrajectory:
    def __init__(self, samples: list[ChoreoTrajectoryState]):
        self.samples = samples

    def __sample_impl(self, timestamp) -> ChoreoTrajectoryState:
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
        tmp = self.__sample_impl(timestamp)

        return tmp.flipped() if mirror_for_red_alliance else tmp

    def get_initial_pose(self):
        return self.samples[0].get_pose()

    def get_final_pose(self):
        return self.samples[-1].getPose()

    def get_total_time(self):
        return self.samples[-1].timestamp

    def get_poses(self):
        return [x.get_pose() for x in self.samples]

    def flipped(self) -> ChoreoTrajectory:
        return ChoreoTrajectory([x.flipped() for x in self.samples])
