<script lang="ts">
  import MenuIcon from "virtual:icons/mdi/menu";
  import UndoIcon from "virtual:icons/mdi/undo";
  import RedoIcon from "virtual:icons/mdi/redo";
  import WaypointList from "./WaypointList.svelte"
  import PathSelector from "./PathSelector.svelte"
  import {PathOrder} from "$lib/path.js";
  export let pathId;
  $: active = PathOrder(pathId);
  $: waypoints = $active;
  let constraints:any[] = [];
  let obstacles:any[] = [];
  let markers:any[] = [];
</script>
<style>
    .Container {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    height: 100%;
    width: var(--sidebar-width);
    color: white;
    background-color: var(--background-dark-gray);
    border-right: thin solid var(--divider-gray);
    }
    .Container > :not(.divider, .Sidebar) {
    padding-left: 8px;
    }
    .Header { 
        flex-shrink: 0;
        height: var(--top-nav-height);
        border-bottom: thin solid var(--divider-gray);
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding-left: 0;
        z-index: 1000;
    }
    .SidebarHeading {
  display: grid;
  grid-template-columns: auto 33.6px;
  height: fit-content;
  align-items: center;
  min-height: 30px;
}
.Sidebar {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: left;
  min-width: var(--sidebar-width);

  box-sizing: border-box;
  padding-block: 8px;
  overflow-x: auto;
  overflow-y: scroll;
  --grid-gap: 8px;
  --line-height: 32px;
  --icon-size: 24px;
}
.Sidebar>.divider:not(:empty) {
  padding-left: 8px;
}

.SidebarHr:not(:empty) {
  color: gray;
  font-size: 14px;
}

.WaypointList {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.SidebarItem {
  color: white;
  border-left: 4px solid var(--background-light-gray);
  height: var(--line-height);
  /* background-color: var(--accent-purple); */
  /* border-radius: 50% !important; */
  width: 100%;
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: 8px;
  padding-top: auto;
  padding-bottom: auto;
  box-sizing: border-box;
  color: white;
  text-align: left;
  display: grid;
  grid-template-columns: var(--icon-size) 1fr max-content;
  align-items: center;
  gap: var(--grid-gap);
  padding-right: 8px;
  user-select: none;
  max-width: 100%;
}

.SidebarItem:hover:not(.Selected) {
  border-left: 4px solid var(--darker-purple);
}
.SidebarItem.Noninteractible {
  border-left: 4px solid transparent;
  background-color: transparent;
}
.Selected {
  border-width: 0;
  border-left: 4px solid var(--select-yellow);
}
.SidebarItem .SidebarIcon,
.SidebarItem .SidebarRightIcon {
  height: var(--icon-size);
  width: var(--icon-size);
}
.SidebarItem .SidebarVerticalLine {
  border-left: solid gray 1px;
  height: calc(100% + var(--grid-gap));
  transform: translate(calc(var(--icon-size) / 2), calc(var(--grid-gap) / -2));
}
.SidebarItem .SidebarLabel {
  color: white;
}
.SidebarItem .SidebarRightIcon {
  padding-right: 8px;
}

</style>
<div class="Container">
    <div
        class="Header"
    > 
      <span class="inline">
        <div class="tooltip tooltip-bottom" data-tip="Main Menu">
          <a href="/" class="btn btn-ghost btn-square btn-md">
            <MenuIcon/>
          </a>
        </div>
        
          <!-- <IconButton
            onClick={() => {
              toggleMainMenu();
            }}
          >
            <MenuIcon></MenuIcon>
          </IconButton> -->
        
        Choreo
      </span>
      <span class="inline">
        <div class="tooltip tooltip-bottom" data-tip="Undo">
          <button class="btn btn-ghost btn-square btn-md">
            <UndoIcon></UndoIcon>
        <!-- <ArrowLeftOutline></ArrowLeftOutline> -->
      </button>
    </div>
        
    <div class="tooltip tooltip-bottom" data-tip="Redo">
      <button class="btn btn-ghost btn-square btn-md">
        <RedoIcon></RedoIcon>
        <!-- <ArrowRightOutline></ArrowRightOutline> -->
      </button>
                </div>
      </span>
    </div>
    
    <div
      class="SidebarHeading"
      style="grid-template-columns: auto 33.6px 33.6px"
    >
      PATHS
      <span></span>
      <span></span>
      <!--<Tooltip title="Duplicate Path">
        <IconButton
          size="small"
          color="default"
          style={{
            float: "right"
          }}
          disabled={
            Object.keys(this.context.model.document.pathlist.paths)
              .length == 0
          }
          onClick={() =>
            this.context.model.document.pathlist.duplicatePath(
              this.context.model.document.pathlist.activePathUUID
            )
          }
        >
          <ContentCopy fontSize="small"></ContentCopy>
        </IconButton>
      </Tooltip>
      <Tooltip disableInteractive title="Add Path">
        <IconButton
          size="small"
          color="default"
          style={{
            float: "right"
          }}
          onClick={() => {
            this.context.model.document.pathlist.addPath("New Path", true);
            Promise.resolve().then(async () => {
              let id = await invoke("add_waypoint");
              await invoke("update_waypoint", {
                id,
                update:{
                x:2.0,
                is_initial_guess:false,
                control_interval_count: 20
              }})
              console.log(await invoke("get_waypoint", {id}))
            })
          }
          }
        >
          <Add fontSize="small"></Add>
        </IconButton>
      </Tooltip>-->
    </div>
    <div class="divider SidebarHr"></div>
    <div
      class="Sidebar max-h-300 min-h-50"
    >
      <PathSelector pathId={pathId}></PathSelector>
    </div>
    <div class="divider SidebarHr"></div>
    <div class="SidebarHeading">FEATURES</div>
    <div class="divider  SidebarHr"/>
    <div class="Sidebar">
      <div class="divider divider-start SidebarHr">WAYPOINTS</div>

      <WaypointList pathOrderStore={active} pathId={pathId}></WaypointList>
      {#if waypoints.length == 0}

      <div class={"SidebarItem Noninteractible"}>
        <span></span>
        <span style="color: gray; font-style: italic">
          No Waypoints
        </span>
      </div>
    {/if}
      <div class="divider divider-start SidebarHr">CONSTRAINTS</div>
      <div class="WaypointList">
        {#each constraints as constraint}
        {/each}
        <!-- {this.context.model.document.pathlist.activePath.constraints.map(
          (constraint) => {
            return (
              <SidebarConstraint
                key={constraint.uuid}
                constraint={constraint}
              ></SidebarConstraint>
            );
          }
        )} -->
      </div>
      {#if constraints.length == 0}

        <div class={"SidebarItem Noninteractible"}>
          <span></span>
          <span style="color: gray; font-style: italic">
            No Constraints
          </span>
        </div>
      {/if}
      <div class="divider divider-start SidebarHr">OBSTACLES</div>
      {#if obstacles.length > 0 }
      
        <div class="WaypointList">
        {#each obstacles as obs}
            
        {/each}
        <!-- {this.context.model.document.pathlist.activePath.obstacles.map(
            (obstacle: ICircularObstacleStore, index: number) => {
            return (
                <SidebarObstacle
                obstacle={obstacle}
                index={index}
                context={this.context}
                ></SidebarObstacle>
            );
            }
        )} -->
        </div>
        {:else if obstacles.length == 0}
        <div
            class="SidebarItem Noninteractible"
        >
            <span></span>
            <span style="color: gray; font-style: italic">
            No Obstacles
            </span>
        </div>
    {/if}
    <div class="divider divider-start SidebarHr">MARKERS</div>
      <div class={"WaypointList"}>
        {#each  markers as marker}
            
        {/each}
        <!-- {this.context.model.document.pathlist.activePath.eventMarkers.map(
          (marker: IEventMarkerStore, index: number) => {
            return (
              <SidebarEventMarker
                marker={marker}
                index={index}
                context={this.context}
                key={marker.uuid}
              ></SidebarEventMarker>
            );
          }
        )} -->
      </div>
      {#if markers.length == 0}
      <div
        class="SidebarItem Noninteractible"
      >
        <span></span>
        <span style="color: gray; font-style: italic">
          No Markers
        </span>
      </div>
      {/if}
      <div class="divider"></div>
    </div>
    </div> 