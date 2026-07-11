import { Component } from "react";
import { doc } from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldPathLines extends Component<Props, State> {
  state = {};

  render() {
    let pathString = "";
    doc.pathlist.activePath.params.waypoints.forEach((point, _index) => {
      pathString += `${point.x.value}, ${point.y.value} `;
    });
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
