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
    const rotation = data.serialize.props.rotation.val;
    const centerX = data.serialize.props.x.val; // x,y are now center coordinates
    const centerY = data.serialize.props.y.val;
    const w = data.serialize.props.w.val;
    const h = data.serialize.props.h.val;

    const center: [number, number] = [centerX, centerY];

    // Calculate current rotated corners in world coordinates
    const corners: [number, number][] = [
      [centerX - w / 2, centerY - h / 2], // bottom-left (index 0)
      [centerX + w / 2, centerY - h / 2], // bottom-right (index 1)
      [centerX + w / 2, centerY + h / 2], // top-right (index 2)
      [centerX - w / 2, centerY + h / 2] // top-left (index 3)
    ];
    const rotatedCorners = corners.map((corner) =>
      this.rotate_around(corner, center, rotation)
    );

    // Determine which corner should stay fixed
    let fixedCornerIndex: number;

    if (!xOffset && !yOffset) {
      // bottom-left corner drag
      fixedCornerIndex = 2; // top-right stays fixed
    } else if (xOffset && !yOffset) {
      // bottom-right corner drag
      fixedCornerIndex = 3; // top-left stays fixed
    } else if (xOffset && yOffset) {
      // top-right corner drag
      fixedCornerIndex = 0; // bottom-left stays fixed
    } else {
      // top-left corner drag
      fixedCornerIndex = 1; // bottom-right stays fixed
    }

    // Position the dragged corner at the absolute cursor position
    const newDraggedCorner: [number, number] = [event.x, event.y];

    // Fixed corner stays in place
    const fixedCorner = rotatedCorners[fixedCornerIndex];

    // Calculate new center and dimensions from the diagonal corners
    const newCenterX = (newDraggedCorner[0] + fixedCorner[0]) / 2;
    const newCenterY = (newDraggedCorner[1] + fixedCorner[1]) / 2;

    // Calculate dimensions by transforming corners to the rectangle's local coordinate system
    const cos_r = Math.cos(-rotation);
    const sin_r = Math.sin(-rotation);

    // Transform both corners to local coordinates relative to new center
    const draggedRelX = newDraggedCorner[0] - newCenterX;
    const draggedRelY = newDraggedCorner[1] - newCenterY;
    const fixedRelX = fixedCorner[0] - newCenterX;
    const fixedRelY = fixedCorner[1] - newCenterY;

    const draggedLocalX = draggedRelX * cos_r - draggedRelY * sin_r;
    const draggedLocalY = draggedRelX * sin_r + draggedRelY * cos_r;
    const fixedLocalX = fixedRelX * cos_r - fixedRelY * sin_r;
    const fixedLocalY = fixedRelX * sin_r + fixedRelY * cos_r;

    // Calculate new width and height
    const newW = Math.abs(draggedLocalX - fixedLocalX);
    const newH = Math.abs(draggedLocalY - fixedLocalY);

    // Get robot dimensions (with bumpers) as minimum size
    const minWidth = doc.robotConfig.bumper.length;
    const minHeight = doc.robotConfig.bumper.width;

    // Apply minimum size constraints
    const constrainedW = Math.max(newW, minWidth);
    const constrainedH = Math.max(newH, minHeight);

    // If dimensions were constrained, recalculate center to keep fixed corner in place
    let finalCenterX = newCenterX;
    let finalCenterY = newCenterY;

    if (constrainedW !== newW || constrainedH !== newH) {
      // When dimensions are constrained, keep the fixed corner in place
      // and calculate the center position based on the constrained dimensions

      // Determine the local coordinates for the fixed corner in the constrained rectangle
      const constrainedFixedLocalX =
        ((fixedLocalX >= 0 ? 1 : -1) * constrainedW) / 2;
      const constrainedFixedLocalY =
        ((fixedLocalY >= 0 ? 1 : -1) * constrainedH) / 2;

      // Calculate where the center should be to keep the fixed corner in place
      // The center is at a local offset from the fixed corner
      const localCenterOffset: [number, number] = [
        -constrainedFixedLocalX,
        -constrainedFixedLocalY
      ];

      // Rotate this offset by the rectangle's rotation to get world coordinates
      const worldCenterOffset = this.rotate_around(
        localCenterOffset,
        [0, 0],
        rotation
      );

      // Calculate the final center position
      finalCenterX = fixedCorner[0] + worldCenterOffset[0];
      finalCenterY = fixedCorner[1] + worldCenterOffset[1];
    }

    // Calculate all new corner positions with the proposed center and dimensions
    const newCorners: [number, number][] = [
      [finalCenterX - constrainedW / 2, finalCenterY - constrainedH / 2], // bottom-left
      [finalCenterX + constrainedW / 2, finalCenterY - constrainedH / 2], // bottom-right
      [finalCenterX + constrainedW / 2, finalCenterY + constrainedH / 2], // top-right
      [finalCenterX - constrainedW / 2, finalCenterY + constrainedH / 2] // top-left
    ];

    // Rotate all corners to world coordinates
    const newRotatedCorners = newCorners.map((corner) =>
      this.rotate_around(corner, [finalCenterX, finalCenterY], rotation)
    );

    // Check if any corner (except the fixed corner itself) is nearly at the same spot as the fixed corner
    const hasCornerCollision = newRotatedCorners.some((corner, index) => {
      // Skip the fixed corner itself
      if (index === fixedCornerIndex) return false;

      const distance = Math.hypot(
        corner[0] - fixedCorner[0],
        corner[1] - fixedCorner[1]
      );
      return distance < 0.1; // tolerance for corner collision
    });

    // Only update if no corner would collapse to the fixed corner position
    if (!hasCornerCollision) {
      // Update rectangle parameters (center-based)
      data.x.set(finalCenterX);
      data.y.set(finalCenterY);
      data.w.set(constrainedW);
      data.h.set(constrainedH);
    }
  }

  dragRegionTranslate(event: any) {
    const data = this.props.data;

    data.x.set(data.serialize.props.x.val + event.dx);
    data.y.set(data.serialize.props.y.val + event.dy);
  }

  startRotation(event: any) {
    const data = this.props.data;
    this.initialRotation = data.serialize.props.rotation.val;

    const centerX = data.serialize.props.x.val; // x,y are now center coordinates
    const centerY = data.serialize.props.y.val;

    // Store initial mouse angle relative to center
    const mouseX = event.x - centerX;
    const mouseY = event.y - centerY;
    this.initialMouseAngle = Math.atan2(mouseY, mouseX);
  }

  dragRotation(event: any) {
    const data = this.props.data;
    const centerX = data.serialize.props.x.val; // x,y are now center coordinates
    const centerY = data.serialize.props.y.val;

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
    // Get robot dimensions (with bumpers) as minimum size
    const minWidth = doc.robotConfig.bumper.length;
    const minHeight = doc.robotConfig.bumper.width;

    // Ensure width and height are positive and meet minimum requirements
    let width = this.props.data.serialize.props.w.val;
    let height = this.props.data.serialize.props.h.val;

    if (width < 0.0) {
      width = -width;
    }
    if (height < 0.0) {
      height = -height;
    }

    // Apply minimum size constraints
    width = Math.max(width, minWidth);
    height = Math.max(height, minHeight);

    this.props.data.w.set(width);
    this.props.data.h.set(height);
  }

  rotate_around(
    point: [number, number],
    center: [number, number],
    angle: number
  ): [number, number] {
    const cos_r = Math.cos(angle);
    const sin_r = Math.sin(angle);

    const rel_x = point[0] - center[0];
    const rel_y = point[1] - center[1];

    const rotated_x = rel_x * cos_r - rel_y * sin_r;
    const rotated_y = rel_x * sin_r + rel_y * cos_r;

    return [center[0] + rotated_x, center[1] + rotated_y];
  }

  render() {
    const data = this.props.data.serialize as DataMap["KeepInRectangle"];
    const centerX = data.props.x.val; // x,y now represent center
    const centerY = data.props.y.val;
    const w = data.props.w.val;
    const h = data.props.h.val;
    const rotation = data.props.rotation.val;

    const center: [number, number] = [centerX, centerY];

    // Original corner points relative to center
    const corners: [number, number][] = [
      [centerX - w / 2, centerY - h / 2], // bottom-left
      [centerX + w / 2, centerY - h / 2], // bottom-right
      [centerX + w / 2, centerY + h / 2], // top-right
      [centerX - w / 2, centerY + h / 2] // top-left
    ];

    // Apply rotation around center using rotate_around method
    const rotatedCorners = corners.map((corner) =>
      this.rotate_around(corner, center, rotation)
    );

    // Create SVG polygon path
    const polygonPoints = rotatedCorners
      .map((corner) => corner.join(","))
      .join(" ");

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
            id={
              index === 0
                ? "dragTarget-keepInRectangle"
                : index === 1
                  ? "dragTarget-keepInRectangleW"
                  : index === 2
                    ? "dragTarget-keepInRectangleWH"
                    : "dragTarget-keepInRectangleH"
            }
          />
        ))}
        {/* Rotation Handle - triangle at center of top edge */}
        {(() => {
          // Calculate center of top edge
          const topLeftCorner = rotatedCorners[3];
          const topRightCorner = rotatedCorners[2];
          const topEdgeCenterX = (topLeftCorner[0] + topRightCorner[0]) / 2;
          const topEdgeCenterY = (topLeftCorner[1] + topRightCorner[1]) / 2;

          // Triangle dimensions (matching waypoint style)
          const triangleSize = DOT * 3;
          const triangleHeight = triangleSize * 0.866; // √3/2 for equilateral triangle

          // Calculate angle for the triangle rotation (perpendicular to edge)
          const edgeVectorX = topRightCorner[0] - topLeftCorner[0];
          const edgeVectorY = topRightCorner[1] - topLeftCorner[1];
          const edgeAngle = Math.atan2(edgeVectorY, edgeVectorX);
          const triangleAngle = edgeAngle + Math.PI / 2; // perpendicular to edge

          return (
            <polygon
              transform={`translate(${topEdgeCenterX}, ${topEdgeCenterY}) rotate(${(triangleAngle * 180) / Math.PI}) translate(${0}, ${0})`}
              fill={"green"}
              stroke={"black"}
              strokeWidth={DOT / 3}
              points={`${-triangleHeight / 2},${triangleSize / 2} ${-triangleHeight / 2},${-triangleSize / 2} ${triangleHeight / 2},${0}`}
              id="dragTarget-keepInRectangleRotation"
            />
          );
        })()}
      </g>
    );
  }
}
export default observer(KeepInRectangleOverlay);
