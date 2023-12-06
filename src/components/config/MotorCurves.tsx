export type MotorCurve = { name: string; motorMaxVelocity: number };
export const MotorCurves: Record<string, MotorCurve> = {
  "Falcon 500": {
    name: "Falcon 500",
    motorMaxVelocity: 6380,
  },
  "Falcon FOC": {
    name: "Falcon FOC",
    motorMaxVelocity: 6080,
  },
  NEO: {
    name: "NEO",
    motorMaxVelocity: 5820,
  },
  "NEO Vortex": {
    name: "NEO Vortex",
    motorMaxVelocity: 6784,
  },
  "Kraken X60": {
    name: "Kraken X60",
    motorMaxVelocity: 6000,
  },
  "Kraken FOC": {
    name: "Kraken FOC",
    motorMaxVelocity: 5800,
  },
};
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
