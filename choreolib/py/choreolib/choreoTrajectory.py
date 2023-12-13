from __future__ import annotations
import math

from wpimath.geometry import Pose2d, Rotation2d
from wpimath.kinematics import ChassisSpeeds

# Doesn't appear to be pulled into python from Interpolatable
def _floatInterp(start, end, frac) -> float:
    return start + (end - start) * frac

class ChoreoTrajectoryState:
    def __init__(self, timestamp:float, x:float, y:float, heading:float,
                 velocityX:float, velocityY:float, angularVelocity:float):
        self.timestamp = timestamp
        self.x = x
        self.y = y
        self.heading = heading
        self.velocityX = velocityX
        self.velocityY = velocityY
        self.angularVelocity = angularVelocity
    
    def getPose(self) -> Pose2d:
        return Pose2d(self.x, self.y, Rotation2d(value=self.heading))
    
    def getChassisSpeeds(self) -> ChassisSpeeds:
        return ChassisSpeeds(self.velocityX, self.velocityY, self.angularVelocity)
        
    def asArray(self) -> list[float]:
        return [self.timestamp, self.x, self.y, self.heading, 
                self.velocityX, self.velocityY, self.angularVelocity]
        
    def interpolate(self, endValue:ChoreoTrajectoryState, t:float) -> ChoreoTrajectoryState:
        scale = (t - self.timestamp) / (endValue.timestamp - self.timestamp)
        
        return ChoreoTrajectoryState(
                t,
                _floatInterp(self.x, endValue.x, scale),
                _floatInterp(self.y, endValue.y, scale),
                _floatInterp(self.heading, endValue.heading, scale),
                _floatInterp(self.velocityX, endValue.velocityX, scale),
                _floatInterp(self.velocityY, endValue.velocityY, scale),
                _floatInterp(self.angularVelocity, endValue.angularVelocity, scale)
                )

    def flipped(self):
        return ChoreoTrajectoryState(
            self.timestamp,
            16.55445 - self.x,
            self.y,
            math.pi - self.heading,
            self.velocityX * -1.0,
            self.velocityY,
            self.angularVelocity * -1.0
        )

    

class ChoreoTrajectory:
    def __init__(self, samples:list[ChoreoTrajectoryState] ):
        self.samples = samples
        
    def _sampleImpl(self, timestamp) -> ChoreoTrajectoryState:
        
        # Handle timestamps outside the trajectory range
        if(timestamp < self.samples[0].timestamp):
            return self.samples[0]
        if(timestamp > self.getTotalTime()):
            return self.samples[-1]
        
        # Binary search to find the two states on either side of the requested timestamps
        low = 0
        high = len(self.samples) - 1
        while( low != high ):
            mid = math.floor( (low + high) / 2)
            if(self.samples[mid].timestamp < timestamp):
                low = mid + 1
            else:
                high = mid
    
        # Handle case near start of trajectory            
        if(low == 0):
            return self.samples[0]
    
        # Find the states on either side of the requested time
        behindState = self.samples[low-1]
        aheadState = self.samples[low]
        
        if(aheadState.timestamp - behindState.timestamp < 1e-6):
            # meh states are so close, just give back one of them
            return aheadState
        
        # Perform the actual interpolation
        return behindState.interpolate(aheadState, timestamp)
    
    def sample(self, timestamp:float, mirrorForRedAlliance:bool=False) -> ChoreoTrajectoryState:
        
        tmp = self._sampleImpl(timestamp)
        
        if(mirrorForRedAlliance):
            return tmp.flipped()
        else:
            # no mirroring
            return tmp  
        
    def getInitialPose(self):
        return self.samples[0].getPose()
    
    def getFinalPose(self):
        return self.samples[-1].getPose()
    
    def getTotalTime(self):
        return self.samples[-1].timestamp
    
    def getPoses(self):
        return [x.getPose() for x in self.samples]
    
    def flipped(self) -> ChoreoTrajectory:
        return ChoreoTrajectory([x.flipped() for x in self.samples])
