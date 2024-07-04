<script lang="ts">

    import { WaypointSubscribers} from "$lib/waypoint.svelte.js";
import * as d3 from "d3";
    import { onMount } from "svelte";
    import BumperBox from "./BumperBox.svelte";
    import { readable, type Readable } from "svelte/store";


let {point, index}: {point:number, index:number} = $props();

let wpt = $derived(WaypointSubscribers[point]!);
type Coordinates = {
  x: number;
  y: number;
};
const targetRadius = 0.1;
const outlineWidth = 0.03;

let bumperLength: Readable<number> = readable(0.9);
let bumperWidth: Readable<number> = readable(0.9);
  let bumperRef: any;
  let rootRef: SVGGElement;

  // gets the angle in degrees between two points
  let calcAngleRad = (p1: Coordinates, p2: Coordinates) => {
    const p1x = p1.x;
    const p1y = p1.y;
    return Math.atan2(p2.y - p1y, p2.x - p1x);
  }

  let coordsFromWaypoint = (): Coordinates => {
    return {
      x: wpt.x,
      y: wpt.y
    };
  }
  let dragPointRotate = (event: any) => {
    const pointerPos: Coordinates = { x: 0, y: 0 };
    pointerPos.x = event.x;
    pointerPos.y = event.y;

    const waypointCoordinates = coordsFromWaypoint();
    // calculates the difference between the current mouse position and the center line
    const angleFinal = calcAngleRad(waypointCoordinates, pointerPos);
    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array
    wpt.heading=angleFinal;
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  }

  // dragPointVelocityRotate(event: any) {
  //   let pointerPos: Coordinates = { x: 0, y: 0 };
  //   pointerPos.x = event.x;
  //   pointerPos.y = event.y;

  //   const waypointCoordinates = this.coordsFromWaypoint();
  //   // calculates the difference between the current mouse position and the center line
  //   var angleFinal = this.calcAngleRad(waypointCoordinates, pointerPos);
  //   // gets the difference of the angles to get to the final angle
  //   // converts the values to stay inside the 360 positive

  //   // creates the new rotate position array
  //   this.props.waypoint.setVelocityAngle(angleFinal);
  //   //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  // }

  let dragPointTranslate = (event: any) => {
    const pointerPos: Coordinates = { x: 0, y: 0 };
    wpt.x = (event.x);
    wpt.y = (event.y);

    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array

    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  }
  let selectWaypoint = () => {
    // this.context.model.document.pathlist.activePath.selectOnly(
    //   this.props.index
    // );
  }
  $effect(()=> {
    if (rootRef) {
      const rotateHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => dragPointRotate(event))
        // .on("start", () => {
        //   this.selectWaypoint();
        //   this.context.history.startGroup(() => {});
        // })
        .on("end", (event) => {
;
        })
        .container(rootRef);
      d3.select<SVGCircleElement, undefined>(
        `#rotateTarget${index}`
      ).call(rotateHandleDrag);

      // var velocityRotateHandleDrag = d3
      //   .drag<SVGCircleElement, undefined>()
      //   .on("drag", (event) => this.dragPointVelocityRotate(event))
      //   .on("end", (event) => this.context.history.stopGroup())
      //   .on("start", () => {
      //     this.selectWaypoint();
      //     this.context.history.startGroup(() => {});
      //   })
      //   .container(this.rootRef.current);
      // d3.select<SVGCircleElement, undefined>(
      //   `#velocityRotateTarget${this.props.index}`
      // ).call(velocityRotateHandleDrag);

      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => dragPointTranslate(event))
        // .on("start", () => {
        //   this.selectWaypoint();
        //   this.context.history.startGroup(() => {});
        // })
        .container(rootRef);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget${index}`
      ).call(dragHandleDrag);
    }
  });

  let appendIndexID = (id: string): string => {
    return `${id}${index}`;
  }

  let getBoxColor = () => {
    return "purple";
    // return this.props.waypoint.selected
    //   ? "var(--select-yellow)"
    //   : "var(--accent-purple)";
  }
  let getDragTargetColor = (): string => {
    return "purple";
    // const waypoints = this.context.model.document.pathlist.activePath.waypoints;
    // let color = "var(--accent-purple)";
    // if (waypoints.length >= 2) {
    //   if (this.props.index === 0) {
    //     color = "green";
    //   }
    //   if (this.props.index === waypoints.length - 1) {
    //     color = "red";
    //   }
    // }

    // if (this.props.waypoint.selected) {
    //   color = "var(--select-yellow)";
    // }
    // return color;
  }

    let boxColorStr = getBoxColor();

    let type = wpt.waypoint_type;
    //const robotConfig = this.context.model.document.robotConfig;
    </script>
      <g bind:this={rootRef}>
        <g
          transform={`translate(${wpt.x}, ${wpt.y}) rotate(${
            (wpt.heading * 180) / Math.PI
          })`}
          id={appendIndexID("waypointGroup")}
        >
            <BumperBox
                bumperLength={$bumperLength}
                bumperWidth={$bumperWidth}
              strokeColor={boxColorStr}
              strokeWidthPx={6}
              dashed={wpt.waypoint_type !== 0}
              index={index}
            ></BumperBox>
          <!-- {/* Heading drag point */} -->
          <circle
            cx={$bumperLength / 2}
            cy={0}
            r={
              targetRadius *
              Math.min($bumperLength, $bumperWidth)
            }
            id={appendIndexID("rotateTarget")}
            fill={boxColorStr}
            stroke-width={outlineWidth}
            stroke="black"
          ></circle>

          <!-- {/* Center Drag Target */} -->

                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <circle
                    cx={0}
                    cy={0}
                    r={
                      targetRadius *
                      1.5 *
                      Math.min(
                        $bumperLength,
                        $bumperWidth
                      )
                    }
                    id={appendIndexID("dragTarget")}
                    fill={
                      type == 2 || type == 3
                        ? "transparent"
                        : getDragTargetColor()
                    }
                    stroke={
                      type == 2 || type == 3
                        ? getDragTargetColor()
                        : "black"
                    }
                    stroke-dasharray={type == 3 ? targetRadius : 0}
                    stroke-width={outlineWidth}
                    onclick={() => {}}
                  ></circle>
        </g>
      </g>
