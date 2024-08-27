import { doc, uiState } from "../../../document/DocumentManager";

import { observer } from "mobx-react";
import {
  PathGradientArgs,
  PathGradients
} from "../../config/robotconfig/PathGradient";

function FieldGeneratedLines() {
  const path = doc.pathlist.activePath;
  let generatedPathString = "";
  const trajectory = path.ui.generating
    ? path.ui.generationProgress
    : path.traj.fullTraj;
  // preserve the acccess of generationIterationNumber
  // to trigger rerenders when mutating the in-progress trajectory in place
  const _ = path.ui.generationIterationNumber;
  trajectory.forEach((point) => {
    generatedPathString += `${point.x},${point.y} `;
  });
  const key = uiState.selectedPathGradient as keyof typeof PathGradients;
  const pathGradient = PathGradients[key];
  if (
    pathGradient === undefined ||
    uiState.selectedPathGradient == PathGradients.None.name
  ) {
    return (
      <polyline
        points={generatedPathString}
        stroke="var(--select-yellow)"
        strokeWidth={0.05}
        fill="transparent"
        style={{ pointerEvents: "none" }}
      ></polyline>
    );
  }
  return (
    <>
      <g>
        {trajectory.length > 1 &&
          trajectory.map((point, i, arr) => {
            if (i == arr.length - 1) {
              return <></>;
            }
            const point2 = arr[i + 1];
            const [sect, indexInSect] = path.traj.getIdxOfFullTraj(i) ?? [0, 0];
            const args: PathGradientArgs = {
              point: point,
              prev: arr[i - 1],
              next: arr[i + 1],
              arr: path.ui.generating
                ? [path.ui.generationProgress]
                : path.traj.samples,
              total: arr.length,
              count: i,
              sect: path.ui.generating ? 0 : sect,
              idxInSect: path.ui.generating ? 0 : indexInSect,
              documentModel: doc
            };
            // 0 t = red, 1 t = green
            return (
              <line
                x1={point.x}
                y1={point.y}
                x2={point2.x}
                y2={point2.y}
                strokeWidth={0.05}
                stroke={pathGradient.function(args)}
              ></line>
            );
          })}
      </g>
    </>
  );
}
export default observer(FieldGeneratedLines);
