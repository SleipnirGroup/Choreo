<script lang="ts">
    export let timeStore: Writable<number>;
    export let trajectory;
    export let totalTime;
    import * as d3 from "d3";
    import {onMount} from "svelte";
    import {GRAPH_PANEL_MIN_HEIGHT} from "$lib/uistate"
    import GraphPanel from "./GraphPanel.svelte"
    let root: SVGSVGElement;
    let widthPx: number;
    let heightPx: number;
    let barLength = 0;
    $: maxBarLength=widthPx-leftMargin-rightMargin;
    function updateBarLength(time, totalTime, widthPx){
        if (totalTime > 0 && widthPx != undefined) {
            barLength = maxBarLength * time/totalTime;
        } else {
            barLength = 0;
        }
    }
    $: updateBarLength($timeStore, totalTime, widthPx)
    const barHeight = 8;
    $: pxToSec = totalTime/maxBarLength
    onMount(()=>{
        const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => {
            timeStore.set(
                Math.min(Math.max(
                    (event.x-leftMargin) * pxToSec, 0), totalTime))
        })
        // .on("start", () => {
        //   this.selectWaypoint();
        //   this.context.history.startGroup(() => {});
        // })
        .container(root);
      d3.select<SVGCircleElement, undefined>(
        `.Root > .handle`
      ).call(dragHandleDrag);
    })
    const topMargin = 12;
    const leftMargin = 40;
    const rightMargin = 40;
    const minTimelineHeight = GRAPH_PANEL_MIN_HEIGHT;

</script>
<style>
    .Timeline {
        flex-grow: 1;
        //height: 100%;

    }
    .Root {
        
        width: 100%;
        height: 100%;
        overflow: visible;
    }
</style>

<div class="Timeline" bind:clientWidth = {widthPx} bind:clientHeight={heightPx}>
    <svg class="Root" bind:this={root}>
        <!-- background -->
        <rect x={leftMargin} y={topMargin} width={maxBarLength} height={barHeight} fill="var(--background-light-gray)"/>
        <rect x={0} y={minTimelineHeight-1} width={widthPx} height={1} fill="var(--divider-gray)"/>
        <GraphPanel xOrigin={leftMargin} yOrigin={minTimelineHeight + 12} width={maxBarLength} height={250} trajectory={trajectory}></GraphPanel> 
        <!-- Playhead vertical line -->
        <rect x={leftMargin+barLength-1} y={topMargin} width={2} height={heightPx-topMargin} fill="var(--divider-gray)"/>
        <!-- Top bar of so-far -->
        <rect x={leftMargin} y={topMargin} width={barLength} height={8} fill="var(--accent-purple)"/>
        <!-- Current time drag handle -->
        <circle class="handle"
            cx={leftMargin + barLength}
            cy ={topMargin + (barHeight / 2)}
            r={barHeight} fill="var(--accent-purple)"/>
        
    </svg>
    </div>