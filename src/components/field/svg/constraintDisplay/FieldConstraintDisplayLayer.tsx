import { observer } from "mobx-react";
import { ConstraintKey } from "../../../../document/ConstraintDefinitions";
import { IConstraintStoreKeyed } from "../../../../document/ConstraintStore";
import { doc } from "../../../../document/DocumentManager";
import FieldConstraintRangeLayer from "./FieldConstraintRangeLayer";
import KeepInCircleOverlay from "./KeepInCircleOverlay";
import KeepInRectangleOverlay from "./KeepInRectangleOverlay";
import PointAtOverlay from "./PointAtOverlay";
import KeepOutCircleOverlay from "./KeepOutCircleOverlay";

const overlays = {
  PointAt: (
    constraint: IConstraintStoreKeyed<"PointAt">,
    lineColor: string
  ) => (
    <PointAtOverlay
      data={constraint.data}
      start={constraint.getStartWaypoint()}
      end={constraint.getEndWaypoint()}
      lineColor={lineColor}
    ></PointAtOverlay>
  ),
  KeepInCircle: (
    constraint: IConstraintStoreKeyed<"KeepInCircle">,
    lineColor: string
  ) => (
    <KeepInCircleOverlay
      data={constraint.data}
      start={constraint.getStartWaypoint()}
      end={constraint.getEndWaypoint()}
      lineColor={lineColor}
    ></KeepInCircleOverlay>
  ),
  KeepInRectangle: (
    constraint: IConstraintStoreKeyed<"KeepInRectangle">,
    lineColor: string
  ) => (
    <KeepInRectangleOverlay
      data={constraint.data}
      start={constraint.getStartWaypoint()}
      end={constraint.getEndWaypoint()}
      lineColor={lineColor}
    ></KeepInRectangleOverlay>
  ),
  KeepOutCircle: (
    constraint: IConstraintStoreKeyed<"KeepOutCircle">,
    lineColor: string
  ) => (
    <KeepOutCircleOverlay
      data={constraint.data}
      start={constraint.getStartWaypoint()}
      end={constraint.getEndWaypoint()}
      lineColor={lineColor}
    ></KeepOutCircleOverlay>
  ),
  StopPoint: (_c: IConstraintStoreKeyed<"StopPoint">) => <></>,
  MaxAcceleration: (_c: IConstraintStoreKeyed<"MaxAcceleration">) => <></>,
  MaxVelocity: (_c: IConstraintStoreKeyed<"MaxVelocity">) => <></>,
  MaxAngularVelocity: (_c: IConstraintStoreKeyed<"MaxAngularVelocity">) => <></>
} satisfies {
  [K in ConstraintKey]: (
    constraint: IConstraintStoreKeyed<K>,
    lineColor: string
  ) => JSX.Element;
};
type Props = {
  constraint?: IConstraintStoreKeyed<ConstraintKey>;
  lineColor: string;
};
function FieldConstraintDisplayLayer(props: Props) {
  const constraint = props.constraint;
  if (constraint === undefined) {
    return <></>;
  }
  const startIndex = constraint.getStartWaypointIndex();
  const endIndex = constraint.getEndWaypointIndex();
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
        constraint,
        props.lineColor
      )}
    </g>
  );
}
export default observer(FieldConstraintDisplayLayer);
