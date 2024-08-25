import { Component } from "react";
import { doc } from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldSamples extends Component<Props, State> {
  state = {};
  LINE_LENGTH = 0.15;
  render() {
    const path = doc.pathlist.activePath;
    const trajectory = path.ui.generating
      ? path.ui.generationProgress
      : path.traj.fullTraj;
    // preserve the acccess of generationIterationNumber
    // to trigger rerenders when mutating the in-progress trajectory in place
    const _ = path.ui.generationIterationNumber;
    return (
      <>
        {trajectory.map((point) => (
          <circle cx={point.x} cy={point.y} r={0.02} fill="black"></circle>
        ))}
      </>
    );
  }
}
export default observer(FieldSamples);
