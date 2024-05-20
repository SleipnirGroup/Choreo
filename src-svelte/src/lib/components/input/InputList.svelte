<script lang="ts">

import styles from "./InputList.module.css";

export let rowGap = 0;
export let noCheckbox = false;
export let style = "";


    const className =
      styles.InputList +
      " " +
      (noCheckbox ? styles.NoCheckbox : "");
    </script>
<div class={className} style={`rowgap: ${rowGap}; ${style}`}>
  <slot></slot>
</div>
