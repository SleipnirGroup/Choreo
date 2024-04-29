<script lang="ts">
    import { playbackTime } from "$lib/uistate.js";
    import { onDestroy } from "svelte";
    import {get} from "svelte/store"
    import {Trajectory} from "$lib/trajectory.js"
    import GraphLegend from "./GraphLegend.svelte";
    import PathAnimationSlider from "./PathAnimationSlider.svelte"
    import {GRAPH_PANEL_MIN_HEIGHT, graphPanelHeight, toggleGraphPanel} from "$lib/uistate"
    export let trajectory: Writable<TrajectorySample[]>

    let running = false;
    let timerId = 0;
    let totalTime =0;
    function updateTotalTime(traj) {
        
        if (traj.length < 2) {
            totalTime = 0;
        } else {
            totalTime = traj[traj.length-1].timestamp;
        }
    }
    $: updateTotalTime($trajectory);
    let i = 0;
    let then = Date.now();
    let step = (dt: number) => incrementTimer(dt);

    function onStart() {
    then = Date.now();
    running = true;
    if (
      Math.abs(
        totalTime - $playbackTime
      ) < 0.1
    ) {
      $playbackTime = 0;
    }
    window.cancelAnimationFrame(timerId);
    timerId = requestAnimationFrame(step);
  }
  function incrementTimer(_: number) {
    const dt = Date.now() - then;
    then = Date.now();
    if (running) {
      const pathAnimationTimestamp =
        $playbackTime;
      if (pathAnimationTimestamp > totalTime) {
        $playbackTime = 0;
      } else {
        playbackTime.update(time=>time+dt / 1e3)
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
        style={`height:${$graphPanelHeight}px`}
      >
        <div
            class={
                "Content " + (totalTime == 0 ? "hide" : "")
            }
        >
        <div class="Sidebar">
            <div class="PlayTime">
                <div class="tooltip align-self-start" data-tip={"Plots"}>
                    <button class="btn btn-ghost btn-sm" on:click={
                        ()=>toggleGraphPanel()
                    }>
                    Plots
                        </button>
                    </div>
                <div class="tooltip align-self-end" data-tip={running ? "Pause":"Play"}>
                <button class="btn btn-ghost btn-sm" on:click={
                    ()=>running ? onStop() : onStart()
                }>
                {#if  running} Pause {:else} Play {/if}
                    </button>

                </div>
                <span
                class="w-min whitespace-nowrap"
                >{`${$playbackTime.toFixed(
                1
              )} s / ${totalTime.toFixed(1)} s`}</span>

            </div>
            <GraphLegend trajectory={$trajectory} time={$playbackTime}></GraphLegend>

        </div>
        <PathAnimationSlider trajectory={$trajectory} timeStore={playbackTime} totalTime={totalTime}></PathAnimationSlider>
        </div>
      </div>

