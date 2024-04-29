
<script lang="ts">
    import { NavbarItemData } from "$lib/uistate";
    import { type, typeName, type Waypoint } from "$lib/waypoint.js";
  import styles from "./Sidebar.module.css";
  export let waypoint: Waypoint;
  export let index: number;
  export let pathLength: number;
  export let issue: string | undefined;
  export let handleDelete: (id: number)=>void;
  let selected = false;
  function getIconColor (pathLength: number) {
    if (selected) {
      return "var(--select-yellow)";
    }
    if (index == 0) {
      return "green";
    }
    if (index == pathLength - 1) {
      return "red";
    }
    return "var(--accent-purple)";
  }
</script>


          <div
            class={
              styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")
            }
          >
          <svelte:component this={NavbarItemData[type(waypoint)].icon} style={`color: ${getIconColor(pathLength)}`}></svelte:component>

            <span
              class={styles.SidebarLabel}
              style="display: grid; grid-template-columns: 1fr auto auto"
            >
              {typeName(waypoint)}
              {#if (issue != undefined && issue.length > 0)}
              <div class="tooltip" data-tip={issue}>
                !
              </div>
              {:else} <span></span>{/if}
              <span>{index + 1}</span>
            </span>
            <div class="tooltip tooltip-left" data-tip="Delete" on:click={()=>{
              handleDelete(waypoint.id)
            }}>Del</div>
          </div>

