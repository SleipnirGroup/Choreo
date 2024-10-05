import { observer } from "mobx-react";
import {
  ConstraintDataTypeMap,
  ConstraintKey
} from "../../../../document/ConstraintDefinitions";
import { IConstraintStoreKeyed } from "../../../../document/ConstraintStore";
import { doc } from "../../../../document/DocumentManager";
import FieldConstraintRangeLayer from "./FieldConstraintRangeLayer";
import KeepInCircleOverlay from "./KeepInCircleOverlay";
import KeepInRectangleOverlay from "./KeepInRectangleOverlay";
import PointAtOverlay from "./PointAtOverlay";
import KeepOutCircleOverlay from "./KeepOutCircleOverlay";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";

export type OverlayProps<K extends keyof ConstraintDataTypeMap> = {
  data: IConstraintStoreKeyed<K>;
  start: IHolonomicWaypointStore;
  end: IHolonomicWaypointStore;
  lineColor: string;
};
const overlays = {
  PointAt: (props: OverlayProps<"PointAt">) => (
    <PointAtOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      lineColor={props.lineColor}
    ></PointAtOverlay>
  ),
  KeepInCircle: (props: OverlayProps<"KeepInCircle">) => (
    <KeepInCircleOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      lineColor={props.lineColor}
    ></KeepInCircleOverlay>
  ),
  KeepInRectangle: (props: OverlayProps<"KeepInRectangle">) => (
    <KeepInRectangleOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      lineColor={props.lineColor}
    ></KeepInRectangleOverlay>
  ),
  KeepOutCircle: (props: OverlayProps<"KeepOutCircle">) => (
    <KeepOutCircleOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      lineColor={props.lineColor}
    ></KeepOutCircleOverlay>
  ),
  StopPoint: () => <></>,
  MaxAcceleration: () => <></>,
  MaxVelocity: () => <></>,
  MaxAngularVelocity: () => <></>
} satisfies {
  [K in ConstraintKey]: (props: OverlayProps<K>) => JSX.Element;
};
type Props = {
  constraint?: IConstraintStoreKeyed<ConstraintKey>;
  points: IHolonomicWaypointStore[];
  lineColor: string;
};
function FieldConstraintDisplayLayer(props: Props) {
  const constraint = props.constraint;
  if (constraint === undefined) {
    return <></>;
  }
  const startIndex = constraint.getStartWaypointIndex(props.points);
  const endIndex = constraint.getEndWaypointIndex(props.points);
  const overlayProps = {
    data: constraint,
    start: constraint.getStartWaypoint(props.points),
    end: constraint.getEndWaypoint(props.points),
    lineColor: props.lineColor
  };
  if (startIndex === undefined) {
    return <></>;
  }
  return (
    <g>
      <FieldConstraintRangeLayer
        points={doc.pathlist.activePath.params.waypoints}
        start={startIndex}
        end={endIndex}
        lineColor={props.lineColor}
        id="display"
      ></FieldConstraintRangeLayer>
      {overlays[constraint.data.type](
        // @ts-expect-error can't cast the constraint as the proper type.
        overlayProps
      )}
    </g>
  );
}
export default observer(FieldConstraintDisplayLayer);
