import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldSamples extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    const path = this.context.model.document.pathlist.activePath;
    return (
      <>
        {path.generated.map((point) => (
          <circle cx={point.x} cy={point.y} r={0.02} fill="black"></circle>
        ))}
      </>
    );
  }
}
export default observer(FieldSamples);
