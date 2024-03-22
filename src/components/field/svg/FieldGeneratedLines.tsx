import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";
import { SavedTrajectorySample } from "../../../document/DocumentSpecTypes";

type Props = object;

type State = object;

class FieldPathLines extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  progress(point: SavedTrajectorySample, i:number, arr: SavedTrajectorySample[]) {
    var t = 1 - (i / arr.length);
    return `hsl(${100 * (t)}, 100%, 50%)`;
  }

  velocity(point: SavedTrajectorySample, i:number, arr: SavedTrajectorySample[]) {
    var t = Math.hypot(point.velocityX, point.velocityY) / 5.0;
    return `hsl(${100 * (t)}, 100%, 50%)`;
  }

  centripetal(point: SavedTrajectorySample, i:number, arr: SavedTrajectorySample[]) {
    var t = 0;
    if (i == 0 || i == arr.length-1) {
      t = 0;
    } else {
      var A = arr[i-1];
      var B = arr[i];
      var C = arr[i+1];
      var ab = Math.hypot(A.x-B.x, A.y-B.y);
      var bc = Math.hypot(B.x-C.x, B.y-C.y);
      var ca = Math.hypot(C.x-A.x, C.y-A.y);
      // area using Heron's formula
      var s = (ab + bc + ca) / 2;
      var area = Math.sqrt(s * (s-ab) * (s-bc) * (s-ca));
      var circumradius = ab * bc * ca / area / 4;

      var vel = Math.hypot(point.velocityX, point.velocityY);

      t = vel * vel / circumradius;
      console.log (t, circumradius, area);
      t /= 10;

    }
    //compute circumradius
    return `hsl(${100 * (1-t)}, 100%, 50%)`;
  }

  accel(point: SavedTrajectorySample, i:number, arr: SavedTrajectorySample[]) {
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

  dt(
    point: SavedTrajectorySample, i:number, arr: SavedTrajectorySample[]) {
      var t = 0;
      if (i == 0 || i == arr.length-1) {
        t = 0;
      } else {
        var A = arr[i];
        var B = arr[i+1];
        var dt = B.timestamp - A.timestamp;
        t = 0.5 + 10 * (0.1-dt);
        console.log(dt, t)
  
      }
      //compute circumradius
      return `hsl(${100 * (t)}, 100%, 50%)`;
    }
  render() {
    let generatedPathString = "";
    let generated = this.context.model.document.pathlist.activePath.generated;
    this.context.model.document.pathlist.activePath.generated.forEach(
      (point) => {
        generatedPathString += `${point.x},${point.y} `;
      }
    );
    return (
      <>

        {/* <polyline
          points={generatedPathString}
          stroke="var(--select-yellow)"
          strokeWidth={0.05}
          fill="transparent"
          style={{ pointerEvents: "none" }}
        ></polyline> */}
        <g>
          {generated.map(
            (point, i, arr)=>{
              if (i == arr.length - 1){ return (<></>)}
              var point2 = arr[i+1];
              // 0 t = red, 1 t = green
              return (
                <line x1={point.x} y1={point.y} x2={point2.x} y2={point2.y}
                strokeWidth={0.05} stroke={this.dt(point, i, arr)}></line>
              )
            })}
        </g>
      </>
    );
  }
}
export default observer(FieldPathLines);
