<script lang="ts">
    import Field from "$lib/components/field/Field.svelte"
    import Sidebar from "$lib/components/sidebar/Sidebar.svelte"
    import PathAnimationPanel from "$lib/components/field/PathAnimationPanel.svelte"
    import {Trajectory} from "$lib/trajectory.svelte.js"
    import { add_path } from "$lib/path.svelte.js";
    let {data} : {data:{id:number}} = $props();
    let id = $derived(data.id);
    $effect.pre(()=>add_path(id));
</script>
<style>
    .App {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    position: fixed;
  }
    .Page {
    background: var(--background-dark-blue);
    width: 100%;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
  
  .Panel {
    position: absolute;
    background: var(--background-dark-blue);
    width: 100%;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    min-width: 0;
    height: calc(100vh);
  }
</style>
<div class="App">
    <div class="Page">
      <!-- <AppMenu></AppMenu> -->
      <span
        style="
          display: flex;
          flex-direction: row;
          flex-grow: 1;
          height: 0;
          width: 100%;"
      >
        <Sidebar pathId={id}></Sidebar>
        <span
            style="
            display: flex;
            flex-direction:column;
            flex-grow: 1;
            width: 0"
        >
          <!-- <Navbar></Navbar> -->
          <Field pathId={id}></Field>
        </span>
      </span>
      <PathAnimationPanel output={Trajectory(id)}></PathAnimationPanel>
    </div>
  </div>
