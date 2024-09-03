import * as d3 from "d3";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { IConstraintDataStore } from "../../../../document/ConstraintDataStore";
import {
  ConstraintKey,
  DataMap
} from "../../../../document/ConstraintDefinitions";
import { doc } from "../../../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";

const STROKE = 0.1;
const DOT = 0.1;

type Props<K extends ConstraintKey> = {
  data: IConstraintDataStore<K>;
  start: IHolonomicWaypointStore;
  end?: IHolonomicWaypointStore;
  lineColor: string;
};
type State = {
  selectedIndex: number;
}
class KeepInPolygonOverlay extends Component<Props<"KeepInPolygon">, State> {
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      const cornerHandleDrag = d3
      .drag<SVGCircleElement, undefined>()
      .on("drag", (event) => this.dragCorner(event))
      .on("start", () => {
        doc.history.startGroup(() => {});
      })
      .on("end", (event) => doc.history.stopGroup())
      .container(this.rootRef.current);
      d3.selectAll<SVGCircleElement, undefined>(`#dragTarget-corner`).call(
        cornerHandleDrag
      );
    }
  }

  dragCorner(event: any) {
    console.log(event);
    console.log(this.state);
  }

  setSelectedIndex(i: number) {
    this.setState({selectedIndex: i});
    console.log(this.state);
  }

  render() {
    const data = this.props.data.serialize as DataMap["KeepInPolygon"];
    const xs = data.props.xs.map((e) => e[1]);
    const ys = data.props.ys.map((e) => e[1]);
    return (
      <g ref={this.rootRef}>
        {xs.map((x, i) => [x, ys[i]]).map(([x, y], i) => (<circle
          cx={x}
          cy={y}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id={"dragTarget-corner"}
          onDrag={(e) => console.log(e)}
        ></circle>))}
      </g>
    );
  }
}
export default observer(KeepInPolygonOverlay);
