<script lang="ts">
    import { onDestroy } from "svelte";
    import {get} from "svelte/store"
    import {Trajectory, type TrajectorySample} from "$lib/trajectory.svelte.js"
    import GraphLegend from "./GraphLegend.svelte";
    import PathAnimationSlider from "./PathAnimationSlider.svelte"
    import {GRAPH_PANEL_MIN_HEIGHT, uistate} from "$lib/uistate.svelte.ts"
    let {output}: {output: Output} = $props();

    let running = $state(false);
    let timerId = $state(0);
    let samples = $derived.by(()=>{console.log("output", output); return output.samples});
    let totalTime = $derived.by(()=>{console.log(samples, samples[0]); return samples[samples.length-1]?.timestamp ?? 0});

    let i = 0;
    let then = Date.now();
    let step = (dt: number) => incrementTimer(dt);

  function onStart() {
    then = Date.now();
    running = true;
    if (
      Math.abs(
        totalTime - uistate.playbackTime
      ) < 0.1
    ) {
      uistate.playbackTime = 0;
    }
    window.cancelAnimationFrame(timerId);
    timerId = requestAnimationFrame(step);
  }
  function incrementTimer(_: number) {
    const dt = Date.now() - then;
    then = Date.now();
    if (running) {
      const pathAnimationTimestamp =
        uistate.playbackTime;
      if (pathAnimationTimestamp > totalTime) {
        uistate.playbackTime = 0;
      } else {
        uistate.playbackTime = uistate.playbackTime+(dt / 1e3);
      }

      timerId = requestAnimationFrame(step);
    }
  }

  function onStop() {
    running = false;
    if (timerId !== 0) {
      window.cancelAnimationFrame(timerId);
    }
  }
  onDestroy(onStop);

//   componentDidMount(): void {
//     hotkeys("space", "all", (e) => {
//       e.preventDefault();
//       if (this.state.running) {
//         this.onStop();
//       } else {
//         this.onStart();
//       }
//     });

//   }
</script>
<style>
    .Panel {
        color: white;
        gap: 1rem;
        width: 100%;
        max-height: var(--timeline-max-height);
        height: 1000;
        min-height: var(--timeline-min-height);
        resize:vertical;
        background-color: var(--background-dark-gray);
        box-sizing: border-box;
        display: block;
        border-top: thin solid var(--divider-gray);
    }
    .Content {
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 100%;
    }
    .Content.hide {
        display: none;
    }
    .Sidebar {
        width: var(--sidebar-width);
        display: flex;
        flex-direction: column;
        height:100%;
        border-right: thin solid var(--divider-gray);
    }
    .PlayTime { 
        height:var(--timeline-min-height);
        border-bottom: thin solid var(--divider-gray);
        display:flex;
        flex-direction:row;
        justify-content: end;
    }

</style>
      <div
        class="Panel"
        style={`height:${uistate.graphPanelHeight}px`}
      >
        <div
            class={
                "Content " + (totalTime == 0 ? "hide" : "")
            }
        >
        <div class="Sidebar">
            <div class="PlayTime">
                <div class="tooltip align-self-start" data-tip={"Plots"}>
                    <button class="btn btn-ghost btn-sm" onclick={
                        ()=>uistate.toggleGraphPanel()
                    }>
                    Plots
                        </button>
                    </div>
                <div class="tooltip align-self-end" data-tip={running ? "Pause":"Play"}>
                <button class="btn btn-ghost btn-sm" onclick={
                    ()=>running ? onStop() : onStart()
                }>
                {#if  running} Pause {:else} Play {/if}
                    </button>

                </div>
                <span
                class="w-min whitespace-nowrap"
                >{`${uistate.playbackTime.toFixed(
                1
              )} s / ${totalTime.toFixed(1)} s`}</span>

            </div>
            <GraphLegend trajectory={output} time={uistate.playbackTime}></GraphLegend>

        </div>
        <PathAnimationSlider trajectory={output} uistate={uistate} totalTime={totalTime}></PathAnimationSlider>
        </div>
      </div>

