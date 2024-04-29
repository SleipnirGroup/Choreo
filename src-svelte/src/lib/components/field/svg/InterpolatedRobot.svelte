<script lang="ts">
    import type { TrajectorySample } from "$lib/trajectory";
    import { fieldScalingFactor } from "$lib/uistate";
    import { sample } from "$lib/util/MathUtil";
    import BumperBox from "./BumperBox.svelte";

  export let timestamp: number;
  export let trajectory: TrajectorySample[];
  export let bumperWidth: number;
  export let bumperLength: number;
  export let wheelbase: number;
  export let trackWidth: number;
  export let wheelRadius: number;
  export let color = "white";
  
</script>
{#if trajectory.length >= 2}
{@const pose1 = sample(
  timestamp,
  trajectory
)}
      <g
        transform={`translate(${pose1.x}, ${pose1.y}) rotate(${
          (pose1.heading * 180) / Math.PI
        })`}
        style="pointerEvents: none"
      >
        

        <BumperBox
        bumperLength={bumperLength}
        bumperWidth={bumperWidth}
        strokeColor={color}
        strokeWidthPx={5}
        index="robot"
        ></BumperBox>

        <circle
          cx={bumperLength / 2}
          cy={0}
          r={0.1}
          fill={color}
        ></circle>
        <circle
          cx={wheelbase / 2}
          cy={trackWidth / 2}
          r={wheelRadius}
          fill={color}
        ></circle>
        <circle
          cx={wheelbase / 2}
          cy={-trackWidth / 2}
          r={wheelRadius}
          fill={color}
        ></circle>
        <circle
          cx={-wheelbase / 2}
          cy={-trackWidth / 2}
          r={wheelRadius}
          fill={color}
        ></circle>
        <circle
          cx={-wheelbase / 2}
          cy={trackWidth / 2}
          r={wheelRadius}
          fill={color}
        ></circle>
      </g>
{/if}