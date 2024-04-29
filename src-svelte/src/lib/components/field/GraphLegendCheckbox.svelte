<script lang="ts">
    export let key: GraphLine;
    export let color: GraphAxis;
    export let store: Writable<boolean>
    import {graphViews, graphColors, type GraphLine } from "$lib/uistate.ts"
    $: console.log(key, $store);
</script>

<span>
    <input type="checkbox" class="checkbox  checkbox-" bind:checked={$store} style={`--chkbg: ${color.color}; border-radius:0`}/>
    </span>
