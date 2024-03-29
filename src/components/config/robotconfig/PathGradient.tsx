import { SavedTrajectorySample } from "../../../document/DocumentSpecTypes";

export type PathGradient = {
  name: string;
  function: (
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[]
  ) => string;
};

class PathGradientFunctions {
  static none(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[]
  ) {
    return "yellow";
  }

  static progress(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[]
  ) {
    const t = 1 - i / arr.length;
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  static velocity(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[]
  ) {
    const t = Math.hypot(point.velocityX, point.velocityY) / 5.0;
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  static centripetal(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[]
  ) {
    let t = 0;
    if (i == 0 || i == arr.length - 1) {
      t = 0;
    } else {
      const A = arr[i - 1];
      const B = arr[i];
      const C = arr[i + 1];
      const ab = Math.hypot(A.x - B.x, A.y - B.y);
      const bc = Math.hypot(B.x - C.x, B.y - C.y);
      const ca = Math.hypot(C.x - A.x, C.y - A.y);
      // area using Heron's formula
      const s = (ab + bc + ca) / 2;
      const area = Math.sqrt(s * (s - ab) * (s - bc) * (s - ca));
      const circumradius = (ab * bc * ca) / area / 4;

      const vel = Math.hypot(point.velocityX, point.velocityY);

      t = (vel * vel) / circumradius;
      t /= 10;
    }
    //compute circumradius
    return `hsl(${100 * (1 - t)}, 100%, 50%)`;
  }

  static accel(point: SavedTrajectorySample, i:number, arr: SavedTrajectorySample[]) {
    var t = 0;
    if (i == 0 || i == arr.length-1) {
      t = 0;
    } else {
      var A = arr[i];
      var B = arr[i+1];
      var t = Math.hypot(B.velocityX-A.velocityX, B.velocityY-A.velocityY);
      var dt = B.timestamp - A.timestamp;
      console.log(t / dt);
      t /= dt;
      t /= 10;
    }
    //compute circumradius
    return `hsl(${100 * (1-t)}, 100%, 50%)`;
  }

  static dt(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[]
  ) {
    let t = 0;
    if (i == 0 || i == arr.length - 1) {
      t = 0;
    } else {
      const A = arr[i];
      const B = arr[i + 1];
      const dt = B.timestamp - A.timestamp;
      t = 0.5 + 10 * (0.1 - dt);
    }
    //compute circumradius
    return `hsl(${100 * t}, 100%, 50%)`;
  }
}

export const PathGradients: Record<
  "None" | "Velocity" | "Progress" | "Centripetal" | "Acceleration" | "Dt",
  PathGradient
> = {
  None: {
    name: "None",
    function: PathGradientFunctions.none
  },
  Velocity: {
    name: "Velocity",
    function: PathGradientFunctions.velocity
  },
  Progress: {
    name: "Progress",
    function: PathGradientFunctions.progress
  },
  Centripetal: {
    name: "Centripetal",
    function: PathGradientFunctions.centripetal
  },
  Acceleration: {
    name: "Acceleration",
    function: PathGradientFunctions.accel
  },
  Dt: {
    name: "Dt",
    function: PathGradientFunctions.dt
  }
};
