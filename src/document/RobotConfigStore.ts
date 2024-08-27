import { Instance, types } from "mobx-state-tree";
import {
  maxTorqueCurrentLimited,
  MotorCurves
} from "../components/config/robotconfig/MotorCurves";
import { InToM, LbsToKg, MToIn } from "../util/UnitConversions";
import { Bumper, Expr, Module, RobotConfig } from "./2025/DocumentTypes";
import { ExpressionStore } from "./ExpressionStore";

const DEFAULT_FRAME_SIZE = InToM(28);
const DEFAULT_BUMPER = DEFAULT_FRAME_SIZE + 2 * InToM(2.5 + 0.75); // 28x28 bot with 2.5" noodle and 0.75" backing
const DEFAULT_WHEELBASE = DEFAULT_FRAME_SIZE - 2 * InToM(2.625); //SDS Mk4i contact patch is 2.625 in from frame edge

const halfBumper = MToIn(DEFAULT_BUMPER / 2);
const halfWheelbase = MToIn(DEFAULT_WHEELBASE / 2);
export const EXPR_DEFAULTS: RobotConfig<Expr> = {
  mass: ["150 lbs", LbsToKg(150)],
  inertia: ["6 kg*m^2", 6],
  vmax: [
    `${(MotorCurves.KrakenX60.vmax * 0.8 * 60) / (2 * Math.PI)} rpm`,
    MotorCurves.KrakenX60.vmax * 0.8
  ],
  tmax: [
    `${maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60)} N*m`,
    maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60)
  ],
  gearing: ["6.75", 6.75], // SDS L2 mk4/mk4i
  radius: ["2 in", InToM(2)],
  bumper: {
    front: [`${halfBumper} in`, DEFAULT_BUMPER / 2],
    left: [`${halfBumper} in`, DEFAULT_BUMPER / 2],
    back: [`${halfBumper} in`, DEFAULT_BUMPER / 2],
    right: [`${halfBumper} in`, DEFAULT_BUMPER / 2]
  },
  modules: [
    {
      x: [`${halfWheelbase} in`, DEFAULT_WHEELBASE / 2],
      y: [`${halfWheelbase} in`, DEFAULT_WHEELBASE / 2]
    },
    {
      x: [`${-halfWheelbase} in`, -DEFAULT_WHEELBASE / 2],
      y: [`${halfWheelbase} in`, DEFAULT_WHEELBASE / 2]
    },
    {
      x: [`${-halfWheelbase} in`, -DEFAULT_WHEELBASE / 2],
      y: [`${-halfWheelbase} in`, -DEFAULT_WHEELBASE / 2]
    },
    {
      x: [`${halfWheelbase} in`, DEFAULT_WHEELBASE / 2],
      y: [`${-halfWheelbase} in`, -DEFAULT_WHEELBASE / 2]
    }
  ]
};

export const BumperStore = types
  .model("BumperStore", {
    front: ExpressionStore,
    left: ExpressionStore,
    right: ExpressionStore,
    back: ExpressionStore
  })
  .views((self) => ({
    serialize(): Bumper<Expr> {
      return {
        front: self.front.serialize(),
        left: self.left.serialize(),
        right: self.right.serialize(),
        back: self.back.serialize()
      };
    },
    snapshot(): Bumper<number> {
      return {
        front: self.front.value,
        left: self.left.value,
        right: self.right.value,
        back: self.back.value
      };
    },
    get length() {
      return self.front.value + self.back.value;
    },
    get width() {
      return self.left.value + self.right.value;
    }
  }))
  .actions((self) => ({
    deserialize(ser: Bumper<Expr>) {
      self.front.deserialize(ser.front);
      self.back.deserialize(ser.back);
      self.right.deserialize(ser.right);
      self.left.deserialize(ser.left);
    }
  }));

export const ModuleStore = types
  .model("ModuleStore", {
    x: ExpressionStore,
    y: ExpressionStore
  })
  .views((self) => ({
    serialize(): Module<Expr> {
      return {
        x: self.x.serialize(),
        y: self.y.serialize()
      };
    },
    snapshot(): Module<number> {
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
export const RobotConfigStore = types
  .model("RobotConfigStore", {
    mass: ExpressionStore,
    inertia: ExpressionStore,
    vmax: ExpressionStore,
    tmax: ExpressionStore,
    gearing: ExpressionStore,
    radius: ExpressionStore,
    bumper: BumperStore,
    modules: types.refinement(
      "Modules",
      types.array(ModuleStore),
      (snap) => snap?.length == 4
    ),
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
      serialize(): RobotConfig<Expr> {
        return {
          mass: self.mass.serialize(),
          inertia: self.inertia.serialize(),
          tmax: self.tmax.serialize(),
          vmax: self.vmax.serialize(),
          gearing: self.gearing.serialize(),
          radius: self.radius.serialize(),
          bumper: self.bumper.serialize(),
          //@ts-expect-error can't encode fixed length array in mobx ts typing
          modules: self.modules.map((mod) => mod.serialize())
        };
      },
      snapshot(): RobotConfig<number> {
        return {
          mass: self.mass.value,
          inertia: self.inertia.value,
          tmax: self.tmax.value,
          vmax: self.vmax.value,
          gearing: self.gearing.value,
          radius: self.radius.value,
          bumper: self.bumper.snapshot(),
          //@ts-expect-error can't encode fixed length array in mobx ts typing
          modules: self.modules.map((mod) => mod.snapshot())
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
        self.gearing.deserialize(config.gearing);
        self.radius.deserialize(config.radius);
        self.bumper.deserialize(config.bumper);
        self.modules.forEach((mod, i) => mod.deserialize(config.modules[i]));
      }
    };
  })
  .views((self) => {
    return {
      bumperSVGElement() {
        const front = self.bumper.front.value;
        const back = -self.bumper.back.value;
        const left = self.bumper.left.value;
        const right = -self.bumper.right.value;
        return `M ${front} ${left}
                L ${front} ${right}
                L ${back} ${right}
                L ${back} ${left}
                L ${front} ${left}`;
      },
      dashedBumperSVGElement() {
        const front = self.bumper.front.value; //l/2
        const back = -self.bumper.back.value; //-l/2
        const left = self.bumper.left.value;
        const right = -self.bumper.right.value;
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
