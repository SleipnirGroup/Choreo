import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = {};

type State = {};

class FieldPathLines extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    let generatedPathString = "";
    this.context.model.pathlist.activePath.generated.forEach((point) => {
      generatedPathString += `${point.x},${point.y} `;
    });
    return (
      <>
        <polyline
          points={generatedPathString}
          stroke="var(--select-yellow)"
          strokeWidth={0.05}
          fill="transparent"
          style={{ pointerEvents: "none" }}
        ></polyline>
      </>
    );
  }
}
export default observer(FieldPathLines);
