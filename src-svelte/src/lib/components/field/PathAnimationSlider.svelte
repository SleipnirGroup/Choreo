<script lang="ts">
    let {uistate=$bindable(), trajectory, totalTime}: Props = $props();
    type Props = {uistate: UIState;
    trajectory: Output;
    totalTime : number;
    }
    import * as d3 from "d3";
    import {onMount} from "svelte";
    import {GRAPH_PANEL_MIN_HEIGHT, type UIState} from "$lib/uistate.svelte.js"
    import GraphPanel from "./GraphPanel.svelte"
    import type { TrajectorySample } from "$lib/trajectory.svelte.js";
    let root: SVGSVGElement;
    let widthPx: number = $state(0);
    let heightPx: number = $state(0);
    let barLength = $derived(
        (totalTime > 0 && widthPx != undefined) ? (maxBarLength * uistate.playbackTime/totalTime) : 0
    );
    const topMargin = 12;
    const leftMargin = 40;
    const rightMargin = 40;
    const minTimelineHeight = GRAPH_PANEL_MIN_HEIGHT;
    let maxBarLength=$derived(widthPx-leftMargin-rightMargin);
    const barHeight = 8;
    let pxToSec = $derived(totalTime/maxBarLength);
    function setTimeFromCoord(svgX: number) {
        uistate.playbackTime =                Math.min(Math.max(
                    (svgX-leftMargin) * pxToSec, 0), totalTime)
    }
    $effect(()=>{
        const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => {
            setTimeFromCoord(event.x);
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
    .handle > circle:hover, .handle > circle:active {
        transform: scale(200%)
    }
</style>

<div class="Timeline" bind:clientWidth = {widthPx} bind:clientHeight={heightPx}>
    <svg class="Root" bind:this={root}>
        <!-- background -->
        <rect x={leftMargin} y={topMargin} width={maxBarLength} height={barHeight} fill="var(--background-light-gray)"
            onclick={(e)=>{
                
                setTimeFromCoord(e.offsetX);
            }}/>
        <rect x={0} y={minTimelineHeight-1} width={widthPx} height={1} fill="var(--divider-gray)"/>
        <GraphPanel xOrigin={leftMargin} yOrigin={minTimelineHeight + 12} width={maxBarLength} height={250} output={trajectory}></GraphPanel> 
        <!-- Playhead vertical line -->
        <rect x={leftMargin+barLength-1} y={topMargin} width={2} height={heightPx-topMargin} fill="var(--divider-gray)"/>
        <!-- Top bar of so-far -->
        <rect x={leftMargin} y={topMargin} width={barLength} height={8} pointer-events="none" fill="var(--accent-purple)"/>
        <!-- Current time drag handle -->
        <g class="handle" transform={`translate(${leftMargin + barLength}, ${topMargin + (barHeight / 2)})`}>
        <circle 
            cx={0}
            cy ={0}
            r={barHeight} fill="var(--accent-purple)"/>
        </g>
        
    </svg>
    </div>