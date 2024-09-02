import { observer } from "mobx-react";
import { IConstraintStore } from "../../../../document/ConstraintStore";
import { doc } from "../../../../document/DocumentManager";
import PointAtOverlay from "./PointAtOverlay";
import FieldConstraintRangeLayer from "./FieldConstraintRangeLayer";

const overlays = {
  PointAt: (constraint: IConstraintStore, lineColor: string) => (
    <PointAtOverlay
      data={constraint.data}
      start={constraint.getStartWaypoint()}
      end={constraint.getEndWaypoint()}
      lineColor={lineColor}
    ></PointAtOverlay>
  )
};
type Props = {
  constraint: IConstraintStore;
  lineColor: string;
};
function FieldConstraintDisplayLayer(props: Props) {
  const constraint = props.constraint;
  const startIndex = constraint.getStartWaypointIndex();
  const endIndex = constraint.getEndWaypointIndex();

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
