<script lang="ts">
  import {type TrajectorySample} from "$lib/trajectory.svelte.js";
  import {PathGradients} from "./PathGradient.js"
  type Props  = {
    trajectory: TrajectorySample[];
    noneColor: string;
  }
  let {trajectory = [], noneColor = "var(--select-yellow)"}:Props = $props();

  let generatedPathString = $derived(updateString(trajectory));

  function updateString(trajectory: TrajectorySample[]) {
    let gen = "";
    trajectory.forEach((point) => {
      gen += `${point.x},${point.y} `;
    });
    return gen;
  }
  const key: keyof PathGradients = "Velocity";
  const pathGradient = PathGradients[key];
</script>

{#if key === "none"}
  <polyline
    points={generatedPathString}
    stroke={noneColor}
    stroke-width={0.05}
    fill="transparent"
    style="pointerEvents: none"
  ></polyline>
{:else}
  <g>
    {#if trajectory.length > 1}
      {#each trajectory as point, i}
        {#if i !== trajectory.length - 1}
          {@const point2 = trajectory[i + 1]}
          <line
            x1={point.x}
            y1={point.y}
            x2={point2.x}
            y2={point2.y}
            stroke-width={0.05}
            stroke={pathGradient.function(point, i, trajectory)}
          ></line>
        {/if}
      {/each}
    {/if}
  </g>
{/if}
