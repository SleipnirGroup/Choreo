<script lang="ts">
    let {key, color, store=$bindable()}: {key: GraphLine, color: GraphAxis, store: boolean} = $props();
    import {graphViews, graphColors, type GraphLine, type GraphAxis } from "$lib/uistate.svelte.ts"
    console.log(key, store);
</script>

<span>
    <input type="checkbox" class="checkbox  checkbox-" bind:checked={store} style={`--chkbg: ${color.color}; border-radius:0`}/>
    </span>
