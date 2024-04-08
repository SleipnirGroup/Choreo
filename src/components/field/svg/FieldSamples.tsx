import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldSamples extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  LINE_LENGTH = 0.15;
  render() {
    const path = this.context.model.document.pathlist.activePath;
    const trajectory = path.generating
      ? path.generationProgress
      : path.generated;
    // preserve this to trigger rerenders when mutating the in-progress trajectory in place
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = path.generationIterationNumber;
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
