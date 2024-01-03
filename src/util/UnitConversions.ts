export const MassUnit = function (imperial: boolean) {
  return imperial ? "lb" : "kg";
};
export const KG_TO_LBS = 2.02462;
export const KgToLbs = (mass: number) => mass * KG_TO_LBS;
export const LbsToKg = (mass: number) => mass / KG_TO_LBS;

export const MetersOrInches = function (imperial: boolean) {
  return imperial ? "in" : "m";
};
export const M_TO_IN = 39.3701;
export const MToIn = (length: number) => length * M_TO_IN;
export const InToM = (length: number) => length / M_TO_IN;

export const MetersOrFeet = function (imperial: boolean) {
  return imperial ? "ft" : "m";
};
export const M_TO_FT = M_TO_IN / 12;
export const MToFt = (length: number) => length * M_TO_FT;
export const FtToM = (length: number) => length / M_TO_FT;
