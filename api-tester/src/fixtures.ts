export type JsonRecord = Record<string, unknown>;

import canonicalProjectText from "../../test/test-default.chor?raw";
import canonicalTrajectoryText from "../../test/test-default.traj?raw";

const expr = (exp: string, val: number) => ({ exp, val });

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export const IDs = {
  project: "11111111-1111-4111-8111-111111111111",
  trajectory: "22222222-2222-4222-8222-222222222222",
  waypointA: "33333333-3333-4333-8333-333333333333",
  waypointB: "44444444-4444-4444-8444-444444444444",
  waypointC: "55555555-5555-4555-8555-555555555555",
  constraintA: "66666666-6666-4666-8666-666666666666",
  constraintExistingB: "6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  constraintB: "77777777-7777-4777-8777-777777777777",
  markerA: "88888888-8888-4888-8888-888888888888",
  markerB: "99999999-9999-4999-8999-999999999999"
};

const canonicalProject = JSON.parse(canonicalProjectText) as JsonRecord;
const canonicalTrajectory = JSON.parse(canonicalTrajectoryText) as JsonRecord;

const projectFixture = deepClone(canonicalProject) as JsonRecord;
projectFixture.uuid = IDs.project;
export const PROJECT_FIXTURE: JsonRecord = projectFixture;

const trajectoryFixture = deepClone(canonicalTrajectory) as JsonRecord;
trajectoryFixture.uuid = IDs.trajectory;
if (typeof trajectoryFixture.version !== "number") {
  trajectoryFixture.version = 4;
}

const params = trajectoryFixture.params as JsonRecord;
const waypoints = (params.waypoints as Array<JsonRecord>) ?? [];
if (waypoints.length >= 2) {
  waypoints[0].uuid = IDs.waypointA;
  waypoints[1].uuid = IDs.waypointB;
}

const constraints = (params.constraints as Array<JsonRecord>) ?? [];
if (constraints.length >= 1) {
  constraints[0].uuid = IDs.constraintA;
}
if (constraints.length >= 2) {
  constraints[1].uuid = IDs.constraintExistingB;
}

const snapshot = trajectoryFixture.snapshot as JsonRecord | undefined;
if (snapshot) {
  const snapshotWaypoints = (snapshot.waypoints as Array<JsonRecord>) ?? [];
  if (snapshotWaypoints.length >= 2) {
    snapshotWaypoints[0].uuid = IDs.waypointA;
    snapshotWaypoints[1].uuid = IDs.waypointB;
  }

  const snapshotConstraints = (snapshot.constraints as Array<JsonRecord>) ?? [];
  if (snapshotConstraints.length >= 1) {
    snapshotConstraints[0].uuid = IDs.constraintA;
  }
  if (snapshotConstraints.length >= 2) {
    snapshotConstraints[1].uuid = IDs.constraintExistingB;
  }
}

const events = (trajectoryFixture.events as Array<JsonRecord>) ?? [];
if (events.length >= 1) {
  events[0].uuid = IDs.markerA;
}

export const TRAJECTORY_FIXTURE: JsonRecord = trajectoryFixture;

export const WAYPOINT_TO_ADD: JsonRecord = {
  uuid: IDs.waypointC,
  x: expr("4 m", 4),
  y: expr("2.5 m", 2.5),
  heading: expr("0.9 rad", 0.9),
  intervals: 10,
  split: false,
  fix_translation: true,
  fix_heading: false,
  override_intervals: true
};

export const CONSTRAINT_TO_ADD: JsonRecord = {
  uuid: IDs.constraintB,
  from: "first",
  data: {
    type: "MaxVelocity",
    max: expr("0.5 m / s", 0.5)
  },
  enabled: true
};

export const MARKER_TO_ADD: JsonRecord = {
  uuid: IDs.markerB,
  name: "Mid Marker",
  from: {
    target: { uuid: IDs.waypointB },
    targetTimestamp: null,
    offset: expr("0 s", 0)
  }
};

export const IMPORT_BUNDLE: JsonRecord = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  project: PROJECT_FIXTURE,
  trajectories: [TRAJECTORY_FIXTURE]
};