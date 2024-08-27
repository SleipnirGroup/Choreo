export type MotorCurve = { name: string; vmax: number; kt: number };

// Data here is from Recalc's motor data at
// https://github.com/tervay/recalc/blob/main/src/common/models/data/motors.json
// kt = stallTorque/stallCurrent

// 1 rpm in rad/s
const rpm = (2 * Math.PI) / 60;
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
    vmax: 6380 * rpm,
    kt: 4.69 / 257.0
  },
  FalconFOC: {
    name: "Falcon with FOC",
    vmax: 6080 * rpm,
    kt: 5.84 / 304
  },
  NEO: {
    name: "NEO",
    vmax: 5880 * rpm,
    kt: 3.28 / 181
  },
  NEOVortex: {
    name: "NEO Vortex",
    vmax: 6784 * rpm,
    kt: 3.6 / 211
  },
  KrakenX60: {
    name: "Kraken X60",
    vmax: 6000 * rpm,
    kt: 7.09 / 366
  },
  KrakenFOC: {
    name: "Kraken with FOC",
    vmax: 5800 * rpm,
    kt: 9.37 / 483
  },
  CIM: {
    name: "CIM",
    vmax: 5330 * rpm,
    kt: 2.41 / 131
  }
};

export function maxTorqueCurrentLimited(kt: number, limitAmps: number) {
  return kt * limitAmps;
}
