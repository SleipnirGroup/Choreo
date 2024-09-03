import { observer } from "mobx-react";
import { IConstraintStore, IConstraintStoreKeyed } from "../../../../document/ConstraintStore";
import { doc } from "../../../../document/DocumentManager";
import PointAtOverlay from "./PointAtOverlay";
import FieldConstraintRangeLayer from "./FieldConstraintRangeLayer";
import { ConstraintDataStore } from "../../../../document/ConstraintDataStore";
import { ConstraintKey } from "../../../../document/ConstraintDefinitions";

const overlays = {
  PointAt: (constraint: IConstraintStoreKeyed<"PointAt">, lineColor: string) => (
    <PointAtOverlay
      data={constraint.data}
      start={constraint.getStartWaypoint()}
      end={constraint.getEndWaypoint()}
      lineColor={lineColor}
    ></PointAtOverlay>
  ),
  StopPoint: undefined,
  MaxAcceleration: undefined,
  MaxVelocity: undefined,
  MaxAngularVelocity: undefined

} satisfies {[K in ConstraintKey]: ((constraint: IConstraintStoreKeyed<K>, lineColor: string)=>JSX.Element) | undefined};
type Props = {
  constraint?: IConstraintStore;
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
      {(overlays[constraint.data.type] ?? ((c: IConstraintStore) => <></>))(
        constraint,
        props.lineColor
      )}
    </g>
  );
}
export default observer(FieldConstraintDisplayLayer);
