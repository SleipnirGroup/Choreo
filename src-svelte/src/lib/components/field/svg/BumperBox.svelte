<script lang="ts">
    import { fieldScalingFactor } from "$lib/uistate";

    export let bumperLength: number;
    export let bumperWidth: number;
    export let strokeColor: string;
    export let strokeWidthPx: number;
    export let dashed: boolean = false;
    export let index: number|string;
    $: bumperSVGElement = `M ${bumperLength / 2} ${bumperWidth / 2}
            L ${bumperLength / 2} ${-bumperWidth / 2}
            L ${-bumperLength / 2} ${-bumperWidth / 2}
            L ${-bumperLength / 2} ${bumperWidth / 2}
            L ${bumperLength / 2} ${bumperWidth / 2}
            `;
      $: dashedBumperSVGElement = `M ${bumperLength / 2} ${bumperWidth / 4}
            L ${bumperLength / 2} ${bumperWidth / 2}
            L ${bumperLength / 4} ${bumperWidth / 2}

            M ${-bumperLength / 4} ${bumperWidth / 2}
            L ${-bumperLength / 2} ${bumperWidth / 2}
            L ${-bumperLength / 2} ${bumperWidth / 4}

            M ${-bumperLength / 2} ${-bumperWidth / 4}
            L ${-bumperLength / 2} ${-bumperWidth / 2}
            L ${-bumperLength / 4} ${-bumperWidth / 2}

            M ${bumperLength / 4} ${-bumperWidth / 2}
            L ${bumperLength / 2} ${-bumperWidth / 2}
            L ${bumperLength / 2} ${-bumperWidth / 4}
            `;
    let appendIndexID = (id: string): string => {
    return `${id}${index}`;
  }
</script>

<g>
    <defs>
      <path
        id={appendIndexID("bumpers")}
        d={
          dashed
            ? dashedBumperSVGElement
            : bumperSVGElement
        }
      ></path>
      <clipPath id={appendIndexID("clip")}>
        <use xlink:href={`#${appendIndexID("bumpers")}`} />
      </clipPath>
    </defs>

    <use
      xlink:href={`#${appendIndexID("bumpers")}`}
      clip-path={`url(#${appendIndexID("clip")})`}
      stroke={strokeColor}
      stroke-width={strokeWidthPx * $fieldScalingFactor}
      stroke-linecap="square"
      fill={"transparent"}
      vector-effect={"non-scaling-stroke"}
      style="pointerEvents: none"
    />
  </g>