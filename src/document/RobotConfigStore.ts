import { Instance, types } from "mobx-state-tree";
import {
  maxTorqueCurrentLimited,
  MotorCurves
} from "../components/config/robotconfig/MotorCurves";
import { InToM, LbsToKg, MToIn } from "../util/UnitConversions";
import { Bumper, Expr, Module, RobotConfig } from "./schema/DocumentTypes";
import { ExpressionStore } from "./ExpressionStore";

const DEFAULT_FRAME_SIZE = InToM(28);
const DEFAULT_BUMPER = DEFAULT_FRAME_SIZE + 2 * InToM(2.5 + 0.75); // 28x28 bot with 2.5" noodle and 0.75" backing
const DEFAULT_WHEELBASE = DEFAULT_FRAME_SIZE - 2 * InToM(2.625); //SDS Mk4i contact patch is 2.625 in from frame edge

const halfBumper = MToIn(DEFAULT_BUMPER / 2);
const halfWheelbase = MToIn(DEFAULT_WHEELBASE / 2);
export const EXPR_DEFAULTS: RobotConfig<Expr> = {
  mass: { exp: "150 lbs", val: LbsToKg(150) },
  inertia: { exp: "6 kg*m^2", val: 6 },
  vmax: {
    exp: `${(MotorCurves.KrakenX60.vmax * 0.8 * 60) / (2 * Math.PI)} rpm`,
    val: MotorCurves.KrakenX60.vmax * 0.8
  },
  tmax: {
    exp: `${maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60)} N*m`,
    val: maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60)
  },
  cof: { exp: "1.5", val: 1.5 },
  gearing: { exp: "6.75", val: 6.75 }, // SDS L2 mk4/mk4i
  radius: { exp: "2 in", val: InToM(2) },
  bumper: {
    front: { exp: `${halfBumper} in`, val: DEFAULT_BUMPER / 2 },
    side: { exp: `${halfBumper} in`, val: DEFAULT_BUMPER / 2 },
    back: { exp: `${halfBumper} in`, val: DEFAULT_BUMPER / 2 }
  },
  frontLeft: {
    x: { exp: `${halfWheelbase} in`, val: DEFAULT_WHEELBASE / 2 },
    y: { exp: `${halfWheelbase} in`, val: DEFAULT_WHEELBASE / 2 }
  },
  backLeft: {
    x: { exp: `${-halfWheelbase} in`, val: -DEFAULT_WHEELBASE / 2 },
    y: { exp: `${halfWheelbase} in`, val: DEFAULT_WHEELBASE / 2 }
  },
  differentialTrackWidth: {
    exp: `${MToIn(DEFAULT_WHEELBASE)} in`,
    val: DEFAULT_WHEELBASE
  },
  motorConfig: {
    stall_torque: { exp: "9.36 N * m", val: 9.36 },
    free_speed: { exp: "5800 RPM", val: (5800.0 / 60.0) * 2 * Math.PI },
    kT: { exp: "0.0197 N * m / A", val: 0.0197 },
    kV: { exp: "0.00206896552 V / RPM", val: 0.00206896552 * 60 / (2 * Math.PI) },
    supply_limit: { exp: "60 A", val: 60.0 },
    stator_limit: { exp: "120 A", val: 120.0 }
  },
};

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const BumperStore = types
  .model("BumperStore", {
    front: ExpressionStore,
    side: ExpressionStore,
    back: ExpressionStore
  })
  .views((self) => ({
    get serialize(): Bumper<Expr> {
      return {
        front: self.front.serialize,
        side: self.side.serialize,
        back: self.back.serialize
      };
    },
    get snapshot(): Bumper<number> {
      return {
        front: self.front.value,
        side: self.side.value,
        back: self.back.value
      };
    },
    get length() {
      return self.front.value + self.back.value;
    },
    get width() {
      return self.side.value * 2;
    }
  }))
  .actions((self) => ({
    deserialize(ser: Bumper<Expr>) {
      self.front.deserialize(ser.front);
      self.back.deserialize(ser.back);
      self.side.deserialize(ser.side);
    }
  }));

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const MotorConfigStore = types
  .model("MotorConfig", {
    free_speed: ExpressionStore,
    stall_torque: ExpressionStore,
    kT: ExpressionStore,
    kV: ExpressionStore,
    supply_limit: ExpressionStore,
    stator_limit: ExpressionStore,
  })
  .views((self) => ({
    get serialize(): MotorConfig<Expr> {
      return {
        free_speed: self.free_speed.serialize,
        stall_torque: self.stall_torque.serialize,
        kT: self.kT.serialize,
        kV: self.kV.serialize,
        supply_limit: self.supply_limit.serialize,
        stator_limit: self.stator_limit.serialize
      };
    },
    get snapshot(): MotorConfig<number> {
      return {
        free_speed: self.free_speed.value,
        stall_torque: self.stall_torque.value,
        kT: self.kT.value,
        kV: self.kV.value,
        supply_limit: self.supply_limit.value,
        stator_limit: self.stator_limit.value
      };
    },
  }))
  .actions((self) => ({
    deserialize(ser: MotorConfig<Expr>) {
      self.free_speed.deserialize(ser.free_speed);
      self.stall_torque.deserialize(ser.stall_torque);
      self.kT.deserialize(ser.kT);
      self.kV.deserialize(ser.kV);
      self.supply_limit.deserialize(ser.supply_limit);
      self.stator_limit.deserialize(ser.stator_limit);
    }
  }));



// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const ModuleStore = types
  .model("ModuleStore", {
    x: ExpressionStore,
    y: ExpressionStore
  })
  .views((self) => ({
    get serialize(): Module<Expr> {
      return {
        x: self.x.serialize,
        y: self.y.serialize
      };
    },
    get snapshot(): Module<number> {
      return {
        x: self.x.value,
        y: self.y.value
      };
    }
  }))
  .actions((self) => ({
    deserialize(ser: Module<Expr>) {
      self.x.deserialize(ser.x);
      self.y.deserialize(ser.y);
    }
  }));

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const RobotConfigStore = types
  .model("RobotConfigStore", {
    mass: ExpressionStore,
    inertia: ExpressionStore,
    vmax: ExpressionStore,
    tmax: ExpressionStore,
    cof: ExpressionStore,
    gearing: ExpressionStore,
    radius: ExpressionStore,
    bumper: BumperStore,
    frontLeft: ModuleStore,
    backLeft: ModuleStore,
    differentialTrackWidth: ExpressionStore,
    motorConfig: MotorConfigStore,
    identifier: types.identifier
  })
  .views((self) => {
    return {
      get wheelMaxVelocity() {
        return self.vmax.value / self.gearing.value;
      },
      get wheelMaxTorque() {
        return self.tmax.value * self.gearing.value;
      },
      get serialize(): RobotConfig<Expr> {
        return {
          mass: self.mass.serialize,
          inertia: self.inertia.serialize,
          tmax: self.tmax.serialize,
          cof: self.cof.serialize,
          vmax: self.vmax.serialize,
          gearing: self.gearing.serialize,
          radius: self.radius.serialize,
          bumper: self.bumper.serialize,
          frontLeft: self.frontLeft.serialize,
          backLeft: self.backLeft.serialize,
          motorConfig: self.motorConfig.serialize,
          differentialTrackWidth: self.differentialTrackWidth.serialize
        };
      },
      get moduleTranslations(): [
        Module<number>,
        Module<number>,
        Module<number>,
        Module<number>
      ] {
        const fl = self.frontLeft.snapshot;
        const bl = self.backLeft.snapshot;
        const br = {
          x: bl.x,
          y: -bl.y
        };
        const fr = {
          x: fl.x,
          y: -fl.y
        };
        return [fl, bl, br, fr];
      },
      get snapshot(): RobotConfig<number> {
        return {
          mass: self.mass.value,
          inertia: self.inertia.value,
          tmax: self.tmax.value,
          cof: self.cof.value,
          vmax: self.vmax.value,
          gearing: self.gearing.value,
          radius: self.radius.value,
          bumper: self.bumper.snapshot,
          frontLeft: self.frontLeft.snapshot,
          backLeft: self.backLeft.snapshot,
          motorConfig: self.motorConfig.snapshot,
          differentialTrackWidth: self.differentialTrackWidth.value
        };
      }
    };
  })
  .actions((self) => {
    return {
      deserialize(config: RobotConfig<Expr>) {
        self.mass.deserialize(config.mass);
        self.inertia.deserialize(config.inertia);
        self.vmax.deserialize(config.vmax);
        self.tmax.deserialize(config.tmax);
        self.cof.deserialize(config.cof);
        self.gearing.deserialize(config.gearing);
        self.radius.deserialize(config.radius);
        self.bumper.deserialize(config.bumper);
        self.frontLeft.deserialize(config.frontLeft);
        self.backLeft.deserialize(config.backLeft);
        self.motorConfig.deserialize(config.motorConfig);
        self.differentialTrackWidth.deserialize(config.differentialTrackWidth);
      }
    };
  })
  .views((self) => {
    return {
      bumperSVGElement() {
        const front = self.bumper.front.value;
        const back = -self.bumper.back.value;
        const left = self.bumper.side.value;
        const right = -self.bumper.side.value;
        return `M ${front} ${left}
                L ${front} ${right}
                L ${back} ${right}
                L ${back} ${left}
                L ${front} ${left}`;
      },
      dashedBumperSVGElement() {
        const front = self.bumper.front.value; //l/2
        const back = -self.bumper.back.value; //-l/2
        const left = self.bumper.side.value;
        const right = -self.bumper.side.value;
        return `
            M ${front} ${left / 2}
            L ${front} ${left}
            L ${front / 2} ${left}

            M ${back / 2} ${left}
            L ${back} ${left}
            L ${back} ${left / 2}

            M ${back} ${right / 2}
            L ${back} ${right}
            L ${back / 2} ${right}

            M ${front / 2} ${right}
            L ${front} ${right}
            L ${front} ${right / 2}
            `;
      }
    };
  });
export type IRobotConfigStore = Instance<typeof RobotConfigStore>;
