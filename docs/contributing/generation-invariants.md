# What Changes during Generation?

> This is development documentation describing the dataflow as of 5/16/2025, updated towards the 2026 beta. It is not accurate for released versions.

This document describes what changes and doesn't change within the generation of a trajectory file.
## Input
`pre.traj` and `pre.chor`
* Presumed to already be schema-updated to the current version

## Output
`post.traj`
* Some fields present in the Rust representation of the trajectory schema are internal and marked to be skipped in serialization. Those are not considered part of the output.

`pre.chor` is unchanged
* Schema updates might cause the file contents to be replaced with the updated version

## After Successful Trajectory Generation
* `name` is unchanged
* `version` is unchanged
* `params` is unchanged
* `snapshot` corresponds to the `params` field
  * EXCEPT for the waypoint control intervals being different/updated if and only if `override_intervals` is false on a given waypoint
  * `snapshot.waypoints[n].heading` matches `params.waypoints[n].heading.val`, not any adjusted value.
* `trajectory` is fully dependent on the generator result, the `snapshot` waypoints' `.intervals` and `.split` fields, and the project type from the project file.
  * `trajectory.type` is either "Swerve" or "Differential"
  * `trajectory.waypoints` is a list of waypoint timestamps with the same length as `snapshot.waypoints`. Its first element is 0 (seconds).
  * `trajectory.samples` is the list of samples
  * `trajectory.splits` is the sample index of every waypoint that starts a split segment. The end waypoint is not included, even if marked split. The start waypoint is always included, even if not marked split. Thus `trajectory.splits` always includes sample index 0 as its first element, and may have other elements.

* `events` is unchanged except that the marker target timestamps are updated as follows for each marker `marker`:
  * If `marker.from.target` (an index of `snapshot.waypoints`) is not None/undefined and is in bounds, `marker.from.target_timestamp = trajectory.waypoints[marker.from.target]`
