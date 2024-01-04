export type MotorCurve = { name: string; motorMaxVelocity: number; kt: number };

// Data here is from Recalc's motor data at
// https://github.com/tervay/recalc/blob/main/src/common/models/data/motors.json
// kt = stallTorque/stallCurrent
export const MotorCurves: Record<string, MotorCurve> = {
  "Falcon 500": {
    name: "Falcon 500",
    motorMaxVelocity: 6380,
    kt: 4.69 / 257.0,
  },
  "Falcon FOC": {
    name: "Falcon with FOC",
    motorMaxVelocity: 6080,
    kt: 5.84 / 304,
  },
  NEO: {
    name: "NEO",
    motorMaxVelocity: 5880,
    kt: 3.28 / 181,
  },
  "NEO Vortex": {
    name: "NEO Vortex",
    motorMaxVelocity: 6784,
    kt: 3.6 / 211,
  },
  "Kraken X60": {
    name: "Kraken X60",
    motorMaxVelocity: 6000,
    kt: 7.09 / 366,
  },
  "Kraken FOC": {
    name: "Kraken with FOC",
    motorMaxVelocity: 5800,
    kt: 9.37 / 483,
  },
  CIM: {
    name: "CIM",
    motorMaxVelocity: 5330,
    kt: 2.41 / 131,
  },
};

export function maxTorqueCurrentLimited(kt: number, limitAmps: number) {
  return kt * limitAmps;
}
export const SwerveModules = {
  SDS: {
    L1: 8.14,
    L2: 6.75,
    L3: 6.12,
    L4: 5.14,
  },
  MaxSwerve: {
    "12T": 5.5,
    "13T": 5.08,
    "14T": 4.71,
  },
};
