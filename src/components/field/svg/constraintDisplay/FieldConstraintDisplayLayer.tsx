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
import KeepInLaneOverlay from "./KeepInLaneOverlay";
import { IConstraintDataStore } from "../../../../document/ConstraintDataStore";

export type OverlayProps<K extends keyof ConstraintDataTypeMap> = {
  data: IConstraintStoreKeyed<K>;
  start: IHolonomicWaypointStore;
  end: IHolonomicWaypointStore;
  lineColor: string;
  select: ()=>void;
  clickable: boolean;
};
export type OverlayElementProps<K extends keyof ConstraintDataTypeMap> = {
  data: IConstraintDataStore<K>;
  start?: IHolonomicWaypointStore;
  end?: IHolonomicWaypointStore;
  selected: boolean;
  select: ()=>void;
  clickable: boolean;
};
const overlays = {
  PointAt: (props: OverlayProps<"PointAt">) => (
    <PointAtOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      lineColor={props.lineColor}
      selected={props.data.selected}
      select={()=>{props.data.setSelected(true)}}
      clickable={props.clickable}
    ></PointAtOverlay>
  ),
  KeepInCircle: (props: OverlayProps<"KeepInCircle">) => (
    <KeepInCircleOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      selected={props.data.selected}
      select={()=>{props.data.setSelected(true)}}
      clickable={props.clickable}
    ></KeepInCircleOverlay>
  ),
  KeepInRectangle: (props: OverlayProps<"KeepInRectangle">) => (
    <KeepInRectangleOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      selected={props.data.selected}
      select={()=>{props.data.setSelected(true)}}
      clickable={props.clickable}
    ></KeepInRectangleOverlay>
  ),
  KeepInLane: (props: OverlayProps<"KeepInLane">) => (
    <KeepInLaneOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      selected={props.data.selected}
      select={()=>{props.data.setSelected(true)}}
      clickable={props.clickable}
    ></KeepInLaneOverlay>
  ),
  KeepOutCircle: (props: OverlayProps<"KeepOutCircle">) => (
    <KeepOutCircleOverlay
      data={props.data.data}
      start={props.start}
      end={props.end}
      selected={props.data.selected}
      select={()=>{props.data.setSelected(true)}}
      clickable={props.clickable}
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
  clickable: boolean;
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
    lineColor: props.lineColor,
    clickable: props.clickable
  };
  if (startIndex === undefined) {
    return <></>;
  }
  return (
    <g key={props.constraint?.uuid ?? "undef"} style={{zIndex: constraint.selected ? "999" : undefined}}>
      <FieldConstraintRangeLayer
        points={doc.pathlist.activePath.params.waypoints}
        start={startIndex}
        end={endIndex}
        lineColor={props.lineColor}
        id={"display"+props.constraint?.uuid ?? "undef"}
      ></FieldConstraintRangeLayer>
      {overlays[constraint.data.type](
        // @ts-expect-error can't cast the constraint as the proper type.
        overlayProps
      )}
    </g>
  );
}
export default observer(FieldConstraintDisplayLayer);
