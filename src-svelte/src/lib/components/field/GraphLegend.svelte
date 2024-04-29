<script lang="ts">
    export let trajectory: TrajectorySample[];
    export let time: number;
    import {sampleD3} from "$lib/util/MathUtil.ts"
    import {graphViews, graphColors, type GraphLine, data as graphData} from "$lib/uistate.ts"
    import GraphLegendCheckbox from "./GraphLegendCheckbox.svelte"
    </script>
<div class="grid px-2 pt-2"
style=" grid-template-columns: min-content max-content 5ch max-content; column-gap:8px">
{#each Object.entries(graphColors) as [name, data]}
{@const value = sampleD3(time, graphData[name])?.toFixed(2) ?? ""}
<GraphLegendCheckbox key={name} store={graphViews[name]} color={data}></GraphLegendCheckbox>
<span>{data.name}</span>
<span style="text-align:right">{value}</span>
<span>{data.units}</span>
{/each}
</div>