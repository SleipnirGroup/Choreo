<script lang="ts">import "../app.pcss";import type { Snippet } from "svelte";
    let { children }: { children: Snippet } = $props();</script>
    {@render children()}