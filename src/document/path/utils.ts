import { WaypointIDX } from "../schema/DocumentTypes";
import { IWaypointScope } from "../ConstraintStore";
import { IHolonomicWaypointStore } from "../HolonomicWaypointStore";

export function findUUIDIndex(uuid: string, items: { uuid: string }[]) {
  return items.findIndex((wpt) => wpt.uuid === uuid);
}

export function waypointIdToSavedWaypointId(
  waypointId: IWaypointScope | undefined,
  points: IHolonomicWaypointStore[]
): "first" | "last" | number | undefined {
  if (waypointId === null || waypointId === undefined) {
    return undefined;
  }
  if (typeof waypointId !== "string") {
    const scopeIndex = findUUIDIndex(waypointId.uuid, points);
    if (scopeIndex == -1) {
      return undefined; // don't try to save this constraint
    }
    return scopeIndex;
  } else {
    return waypointId;
  }
}
export function savedWaypointIdToWaypointId(
  savedId: WaypointIDX | undefined,
  points: IHolonomicWaypointStore[]
): IWaypointScope | undefined {
  if (savedId === null || savedId === undefined) {
    return undefined;
  }

  if (savedId === "first") {
    return "first";
  }
  if (savedId === "last") {
    return "last";
  }
  if (savedId < 0 || savedId >= points.length) {
    return undefined;
  }
  if (!Number.isInteger(savedId)) {
    return undefined;
  } else {
    return { uuid: points[savedId]?.uuid as string };
  }
}
export function getByWaypointID(
  id: IWaypointScope | undefined,
  points: IHolonomicWaypointStore[]
): IHolonomicWaypointStore | undefined {
  if (id === undefined) {
    return undefined;
  } else if (id === "first") {
    return points[0];
  } else if (id === "last") {
    return points[points.length - 1];
  } else if (typeof id.uuid === "string") {
    return points[findUUIDIndex(id.uuid, points)];
  }
}
