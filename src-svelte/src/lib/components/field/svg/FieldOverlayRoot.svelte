<script lang="ts">
// import { observer } from "mobx-react";
// import React, { Component } from "react";
// import DocumentManagerContext from "../../../document/DocumentManager";

import * as d3 from "d3";
import { onMount } from 'svelte';
import {Path} from '$lib/path.svelte.js';


import {Trajectory, type TrajectorySample} from '$lib/trajectory.svelte.js';
import { uistate } from "$lib/uistate.svelte.ts";
import FieldGeneratedLines from "./FieldGeneratedLines.svelte";
// import FieldGrid from "./FieldGrid";
// import FieldPathLines from "./FieldPathLines";
// import InterpolatedRobot from "./InterpolatedRobot";
// import { NavbarLabels, ViewLayers } from "../../../document/UIStateStore";
// import FieldGeneratedLines from "./FieldGeneratedLines";
// import FieldAxisLines from "./FieldAxisLines";
// import FieldConstraintsAddLayer from "./FieldConstraintsAddLayer";
// import FieldObstacle from "./FieldObstacles";
// import { v4 as uuidv4 } from "uuid";
// import { CircularObstacleStore } from "../../../document/CircularObstacleStore";
import FieldImage24 from "./fields/FieldImage24.svelte";
    import OverlayWaypoint from "./OverlayWaypoint.svelte";
    import InterpolatedRobot from "./InterpolatedRobot.svelte";
// import FieldEventMarkers from "./FieldEventMarkers";
// import FieldSamples from "./FieldSamples";
// import FieldGeneratedWaypoints from "./FieldGeneratedWaypoints";
// import FieldEventMarkerAddLayer from "./FieldEventMarkerAddLayer";
let {path}: {path: Path} = $props();
let waypoints : number[] = $derived(path.order());
let trajectory : TrajectorySample[] = $derived(Trajectory(path.id).samples);
let xPan = $state(0);
let yPan = $state(0);
let zoom = $state(1);
let svgRef :SVGSVGElement;
let frameRef: SVGGElement;
const WIDTH_M = 8.21055;
     const LENGTH_M = 16.54175;
    let canvasHeightMeters = $state(WIDTH_M + 1);
    let canvasWidthMeters = $state(LENGTH_M + 1);

let zoomBehavior = d3
      .zoom<SVGGElement, undefined>()
      .scaleExtent([0.3, 12])
      .on("zoom", (e) => zoomed(e));

  let transition = () => {
    return d3.transition().duration(750).ease(d3.easeCubicOut);
  };

  let fieldSelection = () => {
    return d3.select<SVGGElement, undefined>(svgRef);
  };

  // x, y, k are the center coordinates (x, y) and scale factor (k = {0.3, 12})
  let center = (x: number, y: number, k: number) =>{
    fieldSelection().call(zoomBehavior.scaleTo, k);

    fieldSelection()
      .transition(transition())
      .call(zoomBehavior.translateTo, x, -y);
  }

  onMount(()=>{
    // add event listeners for external events
    window.addEventListener("resize", () => handleResize());

    window.addEventListener("center", (e) => {
      center(
        (e as CustomEvent).detail.x,
        (e as CustomEvent).detail.y,
        (e as CustomEvent).detail.k
      );
    });

    window.addEventListener("zoomIn", () => {
      fieldSelection()
        .transition(transition())
        .call(zoomBehavior.scaleBy, 2);
    });

    window.addEventListener("zoomOut", () => {
      fieldSelection()
        .transition(transition())
        .call(zoomBehavior.scaleBy, 0.5);
    });

    // handle initial resizing and setup

    handleResize();

    fieldSelection().call(zoomBehavior).on("dblclick.zoom", null);
}
  )

let zoomed = (e: any) => {
    handleResize();
    xPan = e.transform.x;
    yPan = e.transform.y;
    zoom = e.transform.k;
  }
  let screenSpaceToFieldSpace = (
    current: SVGSVGElement | null,
    { x, y }: { x: number; y: number }
  ): { x: number; y: number } => {
    if (current && current !== undefined) {
      let origin = current.createSVGPoint();
      origin.x = x;
      origin.y = y;
      origin = origin.matrixTransform(
        frameRef.getScreenCTM()!.inverse()
      );
      return { x: origin.x, y: origin.y };
    }
    return { x: 0, y: 0 };
  }
  let getScalingFactor = (current: SVGSVGElement | null): number => {
    if (current && current !== undefined) {
      let origin = current.createSVGPoint();
      origin.x = 0;
      origin.y = 0;
      let zeroOne = current.createSVGPoint();
      zeroOne.x = 0;
      zeroOne.y = 1;
      origin = origin.matrixTransform(
        frameRef.getScreenCTM()!.inverse()
      );
      zeroOne = zeroOne.matrixTransform(
        frameRef.getScreenCTM()!.inverse()
      );
      return -(zeroOne.y - origin.y);
    }
    return 0;
  }
  let handleResize = () => {
    const factor = getScalingFactor(svgRef);
    uistate.fieldScalingFactor = factor;
  }

  let createWaypoint = (e): void  => {
    if (e.currentTarget === e.target) {
      const coords = screenSpaceToFieldSpace(svgRef, {
        x: e.clientX,
        y: e.clientY
      });
      path.addWaypoint({x: coords.x, y: coords.y, translationConstrained: true, headingConstrained: true})
      
    //   this.context.history.startGroup(() => {
    //     const newPoint =
    //       this.context.model.document.pathlist.activePath.addWaypoint();
    //     newPoint.setX(coords.x);
    //     newPoint.setY(coords.y);
    //     newPoint.setSelected(true);
    //     const selectedItem = this.context.model.uiState.selectedNavbarItem;
    //     if (
    //       selectedItem == NavbarLabels.TranslationWaypoint ||
    //       selectedItem == NavbarLabels.EmptyWaypoint
    //     ) {
    //       newPoint.setHeadingConstrained(false);
    //     }
    //     if (selectedItem == NavbarLabels.EmptyWaypoint) {
    //       newPoint.setTranslationConstrained(false);
    //     }
    //     if (selectedItem == NavbarLabels.InitialGuessPoint) {
    //       newPoint.setInitialGuess(true);
    //     }
    //   });
    //   this.context.history.stopGroup();
    }
  }
//   createObstacle(e: React.MouseEvent<SVGCircleElement, MouseEvent>): void {
//     if (e.currentTarget === e.target) {
//       const coords = this.screenSpaceToFieldSpace(this.svgRef?.current, {
//         x: e.clientX,
//         y: e.clientY
//       });
//       this.context.history.startGroup(() => {
//         this.context.model.document.pathlist.activePath.addObstacle(
//           CircularObstacleStore.create({
//             x: coords.x,
//             y: coords.y,
//             radius: 0.5,
//             uuid: uuidv4()
//           })
//         );
//       });
//       this.context.history.stopGroup();
//     }
//   }

    // const constraintSelected =
    //   this.context.model.uiState.isConstraintSelected();
    // const eventMarkerSelected =
    //   this.context.model.uiState.isEventMarkerSelected();
</script>
      <svg
        bind:this={svgRef}
        viewBox={`${-0.5} ${0.5 - canvasHeightMeters} ${
          canvasWidthMeters
        } ${canvasHeightMeters}`}
        xmlns="http://www.w3.org/2000/svg"
        style="width: 100%; height: 100%; position: absolute; top: 0;left: 0"
        id="field-svg-container"
      >
        <g
          transform="matrix({zoom} 0  0 {-zoom} {xPan} {yPan})"
              bind:this={frameRef}
          id="rootFrame"
        >
        <FieldImage24></FieldImage24>
        <FieldGeneratedLines trajectory={trajectory}></FieldGeneratedLines>
        
        <InterpolatedRobot
          timestamp={uistate.playbackTime}
          bumperLength={0.9}
          bumperWidth={0.9}
          wheelbase={0.7}
          trackWidth={0.7}
          trajectory={trajectory}
          wheelRadius={0.05}
        ></InterpolatedRobot>
        {#if true}
              <circle
                cx={0}
                cy={0}
                r={10000}
                style="fill: transparent"
                onclick={(e) => createWaypoint(e)}
              ></circle>
        {/if}
        {#each path.waypoints as pt, idx}
        
        <OverlayWaypoint index={idx} wpt={pt} history={path.history}></OverlayWaypoint>
        {/each}
        </g>
      </svg>
