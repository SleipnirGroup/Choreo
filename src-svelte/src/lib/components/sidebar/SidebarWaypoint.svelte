
<script lang="ts">
    import { NavbarItemData } from "$lib/uistate.svelte.js";
    import { Waypoint } from "$lib/waypoint.svelte.js";
  import styles from "./Sidebar.module.css";
  type Props = {
    waypoint: Waypoint;
    index: number;
    pathLength: number;
    issue: string | undefined;
    handleDelete: (id: number)=>void;
  };
  let {waypoint, index, pathLength, issue, handleDelete}: Props = $props();
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
          <span></span>
          <!-- <svelte:component this={NavbarItemData[type(waypoint)].icon} style={`color: ${getIconColor(pathLength)}`}></svelte:component> -->

            <span
              class={styles.SidebarLabel}
              style="display: grid; grid-template-columns: 1fr auto auto"
            >
              {waypoint.type_name}
              {#if (issue != undefined && issue.length > 0)}
              <div class="tooltip" data-tip={issue}>
                !
              </div>
              {:else} <span></span>{/if}
              <span>{index + 1}</span>
            </span>
            <div class="tooltip tooltip-left" data-tip="Delete" onclick={()=>{
              handleDelete(waypoint.id)
            }}>Del</div>
          </div>

