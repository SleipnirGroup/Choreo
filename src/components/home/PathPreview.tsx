import { observer } from "mobx-react";
import { doc } from "../../document/DocumentManager";
import {
  FIELD_LENGTH,
  FIELD_WIDTH
} from "../field/svg/fields/FieldDimensions";
import field2026Url from "../field/svg/fields/FieldImage2026.svg?url";

export const PREVIEW_W = 300;
export const PREVIEW_H = Math.round((PREVIEW_W * FIELD_WIDTH) / FIELD_LENGTH);

const PathPreview = observer(({ uuid }: { uuid: string }) => {
  const path = doc.pathlist.paths.get(uuid)!;
  const samples = path.trajectory.samples as { x: number; y: number }[];
  const waypoints = path.params.waypoints;
  const hasSamples = samples.length >= 2;

  return (
    <svg
      width={PREVIEW_W}
      height={PREVIEW_H}
      viewBox={`0 ${-FIELD_WIDTH} ${FIELD_LENGTH} ${FIELD_WIDTH}`}
      style={{ display: "block" }}
    >
      <g transform="scale(1,-1)">
        <rect x={0} y={0} width={FIELD_LENGTH} height={FIELD_WIDTH} fill="#1a1d21" />
        <g transform={`scale(1,-1) translate(-0.5,${-FIELD_WIDTH - 0.5})`}>
          <image
            x={0}
            y={0}
            width={FIELD_LENGTH + 1}
            height={FIELD_WIDTH + 1}
            href={field2026Url}
            preserveAspectRatio="none"
            opacity={0.75}
          />
        </g>
        {waypoints.length >= 2 && !hasSamples && (
          <polyline
            points={waypoints.map((w) => `${w.x.value},${w.y.value}`).join(" ")}
            stroke="rgba(125,115,231,0.6)"
            strokeWidth={1.5}
            strokeDasharray="3,3"
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {hasSamples && (
          <polyline
            points={samples.map((s) => `${s.x},${s.y}`).join(" ")}
            stroke="var(--accent-purple)"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {waypoints.map((w, i) => (
          <circle
            key={w.uuid}
            cx={w.x.value}
            cy={w.y.value}
            r={i === 0 || i === waypoints.length - 1 ? 0.18 : 0.12}
            fill={
              i === 0
                ? "var(--accent-purple)"
                : i === waypoints.length - 1
                  ? "var(--select-yellow)"
                  : "white"
            }
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={0.75}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
});

export default PathPreview;
