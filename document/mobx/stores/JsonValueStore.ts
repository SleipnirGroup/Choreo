import { IAnyType, SnapshotIn, types } from "mobx-state-tree";

const JsonPrimitive = types.union(types.string, types.number, types.boolean, types.null);

const JsonValue: IAnyType = types.late(() =>
  types.union(JsonPrimitive, types.array(JsonValue), types.map(JsonValue))
);

export type JsonSnapshot = SnapshotIn<typeof JsonValue>;

export const JsonValueStore = JsonValue;
