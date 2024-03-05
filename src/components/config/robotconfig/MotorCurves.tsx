export type MotorCurve = { name: string; motorMaxVelocity: number; kt: number };

// Data here is from Recalc's motor data at
// https://github.com/tervay/recalc/blob/main/src/common/models/data/motors.json
// kt = stallTorque/stallCurrent
export const MotorCurves: Record<
  | "Falcon500"
  | "FalconFOC"
  | "NEO"
  | "NEOVortex"
  | "KrakenX60"
  | "KrakenFOC"
  | "CIM",
  MotorCurve
> = {
  Falcon500: {
    name: "Falcon 500",
    motorMaxVelocity: 6380,
    kt: 4.69 / 257.0
  },
  FalconFOC: {
    name: "Falcon with FOC",
    motorMaxVelocity: 6080,
    kt: 5.84 / 304
  },
  NEO: {
    name: "NEO",
    motorMaxVelocity: 5880,
    kt: 3.28 / 181
  },
  NEOVortex: {
    name: "NEO Vortex",
    motorMaxVelocity: 6784,
    kt: 3.6 / 211
  },
  KrakenX60: {
    name: "Kraken X60",
    motorMaxVelocity: 6000,
    kt: 7.09 / 366
  },
  KrakenFOC: {
    name: "Kraken with FOC",
    motorMaxVelocity: 5800,
    kt: 9.37 / 483
  },
  CIM: {
    name: "CIM",
    motorMaxVelocity: 5330,
    kt: 2.41 / 131
  }
};

export function maxTorqueCurrentLimited(kt: number, limitAmps: number) {
  return kt * limitAmps;
}
