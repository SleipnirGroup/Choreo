<script lang="ts">

import styles from "./InputList.module.css";
let {
  rowGap = 0,
  noCheckbox = false,
  style
} : {rowGap: number, noCheckbox: boolean, style: string} = $props();



    const className =
      styles.InputList +
      " " +
      (noCheckbox ? styles.NoCheckbox : "");
    </script>
<div class={className} style={`rowgap: ${rowGap}; ${style}`}>
  <slot></slot>
</div>
