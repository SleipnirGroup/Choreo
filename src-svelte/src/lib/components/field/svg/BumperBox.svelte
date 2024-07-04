<script lang="ts">
    import { uistate } from "$lib/uistate.svelte.ts";
    type Props = {
      bumperLength: number;
      bumperWidth: number;
      strokeColor: string;
      strokeWidthPx: number;
      dashed: boolean;
      index: number|string;
    }
    let {bumperLength, bumperWidth, strokeColor, strokeWidthPx, dashed, index}: Props = $props();
    let bumperSVGElement = $derived(`M ${bumperLength / 2} ${bumperWidth / 2}
            L ${bumperLength / 2} ${-bumperWidth / 2}
            L ${-bumperLength / 2} ${-bumperWidth / 2}
            L ${-bumperLength / 2} ${bumperWidth / 2}
            L ${bumperLength / 2} ${bumperWidth / 2}
            `);
    let dashedBumperSVGElement = $derived(`M ${bumperLength / 2} ${bumperWidth / 4}
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
            `);
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
      stroke-width={strokeWidthPx * uistate.fieldScalingFactor}
      stroke-linecap="square"
      fill={"transparent"}
      vector-effect={"non-scaling-stroke"}
      style="pointerEvents: none"
    />
  </g>