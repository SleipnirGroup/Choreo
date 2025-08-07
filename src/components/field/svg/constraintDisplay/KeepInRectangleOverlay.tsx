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
  start?: IHolonomicWaypointStore;
  end?: IHolonomicWaypointStore;
  lineColor: string;
};
class KeepInRectangleOverlay extends Component<
  Props<"KeepInRectangle">,
  object
> {
  rootRef: React.RefObject<SVGGElement | null> = React.createRef<SVGGElement>();
  private initialRotation: number = 0;
  private initialMouseAngle: number = 0;
  componentDidMount() {
    if (this.rootRef.current) {
      // Theres probably a better way to do this
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangle`
      ).call(dragHandleDrag);

      const dragHandleDragW = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, true, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleW`
      ).call(dragHandleDragW);

      const dragHandleDragWH = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, true, true))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleWH`
      ).call(dragHandleDragWH);

      const dragHandleDragH = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, true))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleH`
      ).call(dragHandleDragH);

      const dragHandleRegion = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragRegionTranslate(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleRegion`
      ).call(dragHandleRegion);

      const dragHandleRotation = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragRotation(event))
        .on("start", (event) => {
          doc.history.startGroup(() => {});
          this.startRotation(event);
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleRotation`
      ).call(dragHandleRotation);
    }
  }

  dragPointTranslate(event: any, xOffset: boolean, yOffset: boolean) {
    const data = this.props.data;
    console.log(xOffset, yOffset);
    data.x.set(data.serialize.props.x.val + event.dx * (xOffset ? 0.0 : 1.0));
    data.y.set(data.serialize.props.y.val + event.dy * (yOffset ? 0.0 : 1.0));

    data.w.set(data.serialize.props.w.val - event.dx * (xOffset ? -1.0 : 1.0));
    data.h.set(data.serialize.props.h.val - event.dy * (yOffset ? -1.0 : 1.0));
  }

  dragRegionTranslate(event: any) {
    const data = this.props.data;

    data.x.set(data.serialize.props.x.val + event.dx);
    data.y.set(data.serialize.props.y.val + event.dy);
  }

  startRotation(event: any) {
    const data = this.props.data;
    this.initialRotation = data.serialize.props.rotation.val;
    
    const centerX = data.serialize.props.x.val + data.serialize.props.w.val / 2;
    const centerY = data.serialize.props.y.val + data.serialize.props.h.val / 2;
    
    // Store initial mouse angle relative to center
    const mouseX = event.x - centerX;
    const mouseY = event.y - centerY;
    this.initialMouseAngle = Math.atan2(mouseY, mouseX);
  }

  dragRotation(event: any) {
    const data = this.props.data;
    const centerX = data.serialize.props.x.val + data.serialize.props.w.val / 2;
    const centerY = data.serialize.props.y.val + data.serialize.props.h.val / 2;
    
    // Get current mouse position relative to center
    const mouseX = event.x - centerX;
    const mouseY = event.y - centerY;
    
    // Calculate current mouse angle
    const currentMouseAngle = Math.atan2(mouseY, mouseX);
    
    // Calculate the change in angle from initial mouse position
    const angleDelta = currentMouseAngle - this.initialMouseAngle;
    
    // Set the rotation as initial rotation plus the change
    data.rotation.set(this.initialRotation + angleDelta);
  }

  fixWidthHeight() {
    if (this.props.data.serialize.props.w.val < 0.0) {
      this.props.data.x.set(
        this.props.data.serialize.props.x.val +
          this.props.data.serialize.props.w.val
      );
      this.props.data.w.set(-this.props.data.serialize.props.w.val);
    }

    if (this.props.data.serialize.props.h.val < 0.0) {
      this.props.data.y.set(
        this.props.data.serialize.props.y.val +
          this.props.data.serialize.props.h.val
      );
      this.props.data.h.set(-this.props.data.serialize.props.h.val);
    }
  }

  render() {
    const data = this.props.data.serialize as DataMap["KeepInRectangle"];
    const x = data.props.x.val;
    const y = data.props.y.val;
    const w = data.props.w.val;
    const h = data.props.h.val;
    const rotation = data.props.rotation.val;
    
    // Calculate center and rotated corners
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const cos_r = Math.cos(rotation);
    const sin_r = Math.sin(rotation);
    
    // Original corner points relative to bottom-left origin
    const corners = [
      [x, y],         // bottom-left
      [x + w, y],     // bottom-right  
      [x + w, y + h], // top-right
      [x, y + h],     // top-left
    ];
    
    // Apply rotation around center
    const rotatedCorners = corners.map(([corner_x, corner_y]) => {
      const rel_x = corner_x - centerX;
      const rel_y = corner_y - centerY;
      
      const rotated_x = rel_x * cos_r - rel_y * sin_r;
      const rotated_y = rel_x * sin_r + rel_y * cos_r;
      
      return [centerX + rotated_x, centerY + rotated_y];
    });
    
    // Create SVG polygon path
    const polygonPoints = rotatedCorners.map(corner => corner.join(",")).join(" ");
    
    return (
      <g ref={this.rootRef}>
        {/* Fill Polygon*/}
        <polygon
          points={polygonPoints}
          fill={"green"}
          fillOpacity={0.1}
          id="dragTarget-keepInRectangleRegion"
        />
        {/*Border Polygon*/}
        <polygon
          points={polygonPoints}
          fill={"transparent"}
          pointerEvents={"visibleStroke"}
          stroke={"green"}
          strokeWidth={STROKE}
          strokeOpacity={1.0}
        />
        {/* Rotated Corners */}
        {rotatedCorners.map((corner, index) => (
          <circle
            key={index}
            cx={corner[0]}
            cy={corner[1]}
            r={DOT}
            fill={"green"}
            fillOpacity={1.0}
            id={index === 0 ? "dragTarget-keepInRectangle" : 
                index === 1 ? "dragTarget-keepInRectangleW" :
                index === 2 ? "dragTarget-keepInRectangleWH" : 
                "dragTarget-keepInRectangleH"}
          />
        ))}
        {/* Rotation Handle - show as a line from center to top-right */}
        <line
          x1={centerX}
          y1={centerY}
          x2={rotatedCorners[2][0]}
          y2={rotatedCorners[2][1]}
          stroke={"blue"}
          strokeWidth={STROKE * 0.5}
          strokeOpacity={0.8}
        />
        <circle
          cx={rotatedCorners[2][0]}
          cy={rotatedCorners[2][1]}
          r={DOT * 1.5}
          fill={"blue"}
          fillOpacity={0.8}
          id="dragTarget-keepInRectangleRotation"
        />
      </g>
    );
  }
}
export default observer(KeepInRectangleOverlay);
