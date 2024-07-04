<script lang="ts">
    import styles from "./Sidebar.module.css";
    import PathSelectorOption from "./PathSelectorOption.svelte";
    let {pathId}: {pathId:number}  = $props();
</script>

<div>
  <div class={styles.WaypointList}>
    <PathSelectorOption id={1} selected={pathId==1}></PathSelectorOption>
    <PathSelectorOption id={2} selected={pathId==2}></PathSelectorOption>
  </div>
</div>
