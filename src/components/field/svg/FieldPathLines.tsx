import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldPathLines extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    let pathString = "";
    this.context.model.document.pathlist.activePath.waypoints.forEach(
      (point, index) => {
        pathString += `${point.x}, ${point.y} `;
      }
    );
    return (
      <>
        <polyline
          points={pathString}
          stroke="grey"
          strokeWidth={0.05}
          fill="transparent"
          style={{ pointerEvents: "none" }}
        ></polyline>
      </>
    );
  }
}
export default observer(FieldPathLines);
