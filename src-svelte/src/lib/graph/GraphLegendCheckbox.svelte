<script lang="ts">
    let {key, color, store}: {key: GraphLine, color: GraphAxis, store: Signal<boolean>} = $props();
    import {graphViews, graphColors, type GraphLine, type GraphAxis } from "./graph.js"
    import type { Signal } from "$lib/util/state.svelte.js";
    
</script>

<span>
    <input type="checkbox" class="checkbox  checkbox-" checked={store()} onchange={(e)=>store.set(e.currentTarget.checked)} style={`--chkbg: ${color.color}; border-radius:0`}/>
</span>
