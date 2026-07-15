import { Instance, types } from "mobx-state-tree";
import {
  maxTorqueCurrentLimited,
  MotorCurves
} from "../components/config/robotconfig/MotorCurves";
import { InToM, LbsToKg, MToIn } from "../util/UnitConversions";
import {
  deepCopy,
  type Module,
  type ModuleValue,
  type MotorConfigValue,
  RobotConfig,
  RobotConfigValue
} from "./schema/DocumentTypes";
import { ExpressionStore } from "./ExpressionStore";

const DEFAULT_FRAME_SIZE = InToM(28);
const DEFAULT_BUMPER = DEFAULT_FRAME_SIZE + 2 * InToM(2.5 + 0.75); // 28x28 bot with 2.5" noodle and 0.75" backing
const DEFAULT_WHEELBASE = DEFAULT_FRAME_SIZE - 2 * InToM(2.625); //SDS Mk4i contact patch is 2.625 in from frame edge

const halfBumper = MToIn(DEFAULT_BUMPER / 2);
const halfWheelbase = MToIn(DEFAULT_WHEELBASE / 2);
export const EXPR_DEFAULTS: RobotConfig = {
  mass: { exp: "150 lbs", val: LbsToKg(150) },
  inertia: { exp: "6 kg*m^2", val: 6 },
  gearing: { exp: "6.75", val: 6.75 }, // SDS L2 mk4/mk4i
  radius: { exp: "2 in", val: InToM(2) },
  cof: { exp: "1.5", val: 1.5 },
  differential_track_width: {
    exp: `${MToIn(DEFAULT_WHEELBASE)} in`,
    val: DEFAULT_WHEELBASE
  },
  wheels: [
    {
      x: { exp: `${halfWheelbase} in`, val: DEFAULT_WHEELBASE / 2 },
      y: { exp: `${halfWheelbase} in`, val: DEFAULT_WHEELBASE / 2 }
    },
    {
      x: { exp: `${-halfWheelbase} in`, val: -DEFAULT_WHEELBASE / 2 },
      y: { exp: `${halfWheelbase} in`, val: DEFAULT_WHEELBASE / 2 }
    },
    {
      x: { exp: `${-halfWheelbase} in`, val: -DEFAULT_WHEELBASE / 2 },
      y: { exp: `${-halfWheelbase} in`, val: -DEFAULT_WHEELBASE / 2 }
    },
    {
      x: { exp: `${halfWheelbase} in`, val: DEFAULT_WHEELBASE / 2 },
      y: { exp: `${-halfWheelbase} in`, val: -DEFAULT_WHEELBASE / 2 }
    }
  ],
  bumpers: [
    {
      x: { exp: `${halfBumper} in`, val: DEFAULT_BUMPER / 2 },
      y: { exp: `${halfBumper} in`, val: DEFAULT_BUMPER / 2 }
    },
    {
      x: { exp: `${-halfBumper} in`, val: -DEFAULT_BUMPER / 2 },
      y: { exp: `${halfBumper} in`, val: DEFAULT_BUMPER / 2 }
    },
    {
      x: { exp: `${-halfBumper} in`, val: -DEFAULT_BUMPER / 2 },
      y: { exp: `${-halfBumper} in`, val: -DEFAULT_BUMPER / 2 }
    },
    {
      x: { exp: `${halfBumper} in`, val: DEFAULT_BUMPER / 2 },
      y: { exp: `${-halfBumper} in`, val: -DEFAULT_BUMPER / 2 }
    }
  ],
  motor: {
    free_speed: {
      exp: `${(MotorCurves.KrakenX60.vmax * 0.8 * 60) / (2 * Math.PI)} rpm`,
      val: MotorCurves.KrakenX60.vmax * 0.8
    },
    stall_torque: {
      exp: `${maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60)} N*m`,
      val: maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60)
    },
    kT: {
      exp: `${MotorCurves.KrakenX60.kt} N*m/A`,
      val: MotorCurves.KrakenX60.kt
    },
    kV: {
      exp: "0.1 V*s/rad",
      val: 0.1
    },
    supply_limit: { exp: "60 A", val: 60 },
    stator_limit: { exp: "60 A", val: 60 }
  }
};

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const ModuleStore = types
  .model("ModuleStore", {
    x: ExpressionStore,
    y: ExpressionStore
  })
  .views((self) => ({
    get serialize(): Module {
      return {
        x: self.x.serialize,
        y: self.y.serialize
      };
    },
    get valueCopy(): ModuleValue {
      return deepCopy({
        x: self.x.value,
        y: self.y.value
      });
    }
  }))
  .actions((self) => ({
    deserialize(ser: Module) {
      self.x.deserialize(ser.x);
      self.y.deserialize(ser.y);
    }
  }));

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const MotorStore = types
  .model("MotorStore", {
    free_speed: ExpressionStore,
    stall_torque: ExpressionStore,
    kT: ExpressionStore,
    kV: ExpressionStore,
    supply_limit: ExpressionStore,
    stator_limit: ExpressionStore
  })
  .views((self) => ({
    get serialize(): RobotConfig["motor"] {
      return {
        free_speed: self.free_speed.serialize,
        stall_torque: self.stall_torque.serialize,
        kT: self.kT.serialize,
        kV: self.kV.serialize,
        supply_limit: self.supply_limit.serialize,
        stator_limit: self.stator_limit.serialize
      };
    },
    get valueCopy(): MotorConfigValue {
      return deepCopy({
        free_speed: self.free_speed.value,
        stall_torque: self.stall_torque.value,
        kT: self.kT.value,
        kV: self.kV.value,
        supply_limit: self.supply_limit.value,
        stator_limit: self.stator_limit.value
      });
    }
  }))
  .actions((self) => ({
    deserialize(ser: RobotConfig["motor"]) {
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
export const RobotConfigStore = types
  .model("RobotConfigStore", {
    mass: ExpressionStore,
    inertia: ExpressionStore,
    cof: ExpressionStore,
    gearing: ExpressionStore,
    radius: ExpressionStore,
    differential_track_width: ExpressionStore,
    wheels: types.array(ModuleStore),
    bumpers: types.array(ModuleStore),
    motor: MotorStore,
    identifier: types.identifier
  })
  .views((self) => {
    return {
      get wheelMaxVelocity() {
        return self.motor.free_speed.value / self.gearing.value;
      },
      get wheelMaxTorque() {
        return self.motor.stall_torque.value * self.gearing.value;
      },
      get serialize(): RobotConfig {
        const wheels = self.wheels.map((wheel) => wheel.serialize);
        return {
          mass: self.mass.serialize,
          inertia: self.inertia.serialize,
          cof: self.cof.serialize,
          gearing: self.gearing.serialize,
          radius: self.radius.serialize,
          differential_track_width: self.differential_track_width.serialize,
          wheels: [
            wheels[0],
            wheels[1],
            wheels[2],
            wheels[3]
          ] as RobotConfig["wheels"],
          bumpers: self.bumpers.map((point) => point.serialize),
          motor: self.motor.serialize
        };
      },
      get snapshot(): RobotConfigValue {
        return this.valueCopy;
      },
      get moduleTranslations(): [
        ModuleValue,
        ModuleValue,
        ModuleValue,
        ModuleValue
      ] {
        const fl = self.wheels[0]?.valueCopy ?? { x: 0, y: 0 };
        const bl = self.wheels[1]?.valueCopy ?? { x: 0, y: 0 };
        const br = self.wheels[2]?.valueCopy ?? { x: 0, y: 0 };
        const fr = self.wheels[3]?.valueCopy ?? { x: 0, y: 0 };
        return [fl, bl, br, fr];
      },
      get bumper() {
        if (self.bumpers.length === 0) {
          return { length: 0, width: 0 };
        }
        const xs = self.bumpers.map((point) => point.x.value);
        const ys = self.bumpers.map((point) => point.y.value);
        return {
          length: Math.max(...xs) - Math.min(...xs),
          width: Math.max(...ys) - Math.min(...ys)
        };
      },
      get valueCopy(): RobotConfigValue {
        const wheelValues = self.wheels.map((wheel) => wheel.valueCopy);
        return deepCopy({
          mass: self.mass.value,
          inertia: self.inertia.value,
          cof: self.cof.value,
          gearing: self.gearing.value,
          radius: self.radius.value,
          differential_track_width: self.differential_track_width.value,
          wheels: [
            wheelValues[0] ?? { x: 0, y: 0 },
            wheelValues[1] ?? { x: 0, y: 0 },
            wheelValues[2] ?? { x: 0, y: 0 },
            wheelValues[3] ?? { x: 0, y: 0 }
          ],
          bumpers: self.bumpers.map((point) => point.valueCopy),
          motor: self.motor.valueCopy
        });
      }
    };
  })
  .actions((self) => {
    return {
      deserialize(config: RobotConfig) {
        self.mass.deserialize(config.mass);
        self.inertia.deserialize(config.inertia);
        self.cof.deserialize(config.cof);
        self.gearing.deserialize(config.gearing);
        self.radius.deserialize(config.radius);
        self.differential_track_width.deserialize(config.differential_track_width);
        config.wheels.forEach((wheel, index) => {
          const current = self.wheels[index];
          if (current !== undefined) {
            current.deserialize(wheel);
          }
        });
        config.bumpers.forEach((bumperPoint, index) => {
          const current = self.bumpers[index];
          if (current !== undefined) {
            current.deserialize(bumperPoint);
          }
        });
        self.motor.deserialize(config.motor);
      }
    };
  })
  .views((self) => {
    return {
      bumperSVGElement() {
        if (self.bumpers.length === 0) {
          return "";
        }
        const first = self.bumpers[0];
        const commands = self.bumpers
          .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x.value} ${point.y.value}`)
          .join(" ");
        return `${commands} L ${first.x.value} ${first.y.value}`;
      },
      dashedBumperSVGElement() {
        return this.bumperSVGElement();
      }
    };
  });
export type IRobotConfigStore = Instance<typeof RobotConfigStore>;
