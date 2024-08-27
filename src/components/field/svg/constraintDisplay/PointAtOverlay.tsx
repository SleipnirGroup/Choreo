import { observer } from "mobx-react"
import { IConstraintDataStore } from "../../../../document/ConstraintDataStore"
import { ConstraintData, ConstraintKey, DataMap } from "../../../../document/ConstraintDefinitions"
import { IConstraintStore } from "../../../../document/ConstraintStore"
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore"
import { Component } from "react"
import * as d3 from "d3"
import React from "react"
import { doc } from "../../../../document/DocumentManager"

type Props<K extends ConstraintKey> = {
    data: IConstraintDataStore<K>,
    start: IHolonomicWaypointStore,
    end?: IHolonomicWaypointStore,
    lineColor: string
}
class PointAtOverlay extends Component<Props<"PointAt">, object>{
    rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
    componentDidMount() {
        if (this.rootRef.current) {    
          const dragHandleDrag = d3
            .drag<SVGCircleElement, undefined>()
            .on("drag", (event) => this.dragPointTranslate(event))
            .on("start", () => {
              doc.history.startGroup(() => {});
            })
            .on("end", (event) => doc.history.stopGroup())
            .container(this.rootRef.current);
          d3.select<SVGCircleElement, undefined>(
            `#dragTarget-pointat`
          ).call(dragHandleDrag);
        }
      }
      dragPointTranslate(event: any) {
        const pointerPos = { x: 0, y: 0 };
        pointerPos.x = event.x;
        pointerPos.y = event.y;
    
        // gets the difference of the angles to get to the final angle
        // converts the values to stay inside the 360 positive
    
        // creates the new rotate position array
        this.props.data.x.set(event.x);
        this.props.data.y.set(event.y);
      }
    render() {
    let data = this.props.data.serialize as DataMap["PointAt"];
    //console.log("display point at overlay", data);
    return <g ref={this.rootRef}>
        <circle cx={data.props.x[1]} cy={data.props.y[1]} r={0.1} stroke={this.props.lineColor} strokeWidth={0.02} fill="transparent"></circle>
        <circle id="dragTarget-pointat" cx={data.props.x[1]} cy={data.props.y[1]} r={0.2} stroke={this.props.lineColor} strokeWidth={0.02} fill="transparent"></circle>
        </g>
    }
}
export default observer(PointAtOverlay)