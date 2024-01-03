export const MassUnit = function(imperial:boolean) {
    return imperial ? "lb" : "kg";
}
export const KG_TO_LBS = 2.02462;
export const KgToLbs = (imperial: boolean, mass: number)=> imperial ? (mass * KG_TO_LBS) : mass;
export const LbsToKg = (imperial: boolean, mass: number)=> imperial ? mass / KG_TO_LBS : mass;

export const MetersOrInches = function(imperial:boolean) {
    return imperial ? "in": "m";
}
export const M_TO_IN = 39.3701;
export const MToIn = (imperial: boolean, length: number)=> imperial ? (length * M_TO_IN) : length;
export const InToM = (imperial: boolean, length: number)=> imperial ? length / M_TO_IN : length;

export const MetersOrFeet = function(imperial:boolean) {
    return imperial ? "ft": "m";
}
export const M_TO_FT = M_TO_IN / 12;
export const MToFt = (imperial: boolean, length: number)=> imperial ? (length * M_TO_FT) : length;
export const FtToM = (imperial: boolean, length: number)=> imperial ? length / M_TO_FT : length;