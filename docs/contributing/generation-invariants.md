# Generation Invariants

> This is development documentation describing the dataflow as of 5/16/2025. It is not accurate for released versions.
## Input
`pre.traj` and `pre.chor`
* presumed to already be schema-updated to current

## Output
`post.traj` as serialized  (file write or other response)

`pre.chor` is unchanged
    * Schema updates might cause the file contents to be replaced with the updated version



## After Successful Trajectory Generation
* `name` is unchanged
* `version` is unchanged
* `params` is unchanged
* `snapshot` corresponds to the `params` field
  * EXCEPT for the waypoint control intervals being different/updated if and only if `override_intervals` is false on a given waypoint
  * Serializing `snapshot` does not preserve the helper fields is_initial_guess and adjusted_heading, same as how serializing `params` does not preserve them
* `trajectory` is fully dependent on the generator result, the `snapshot` waypoints' `.intervals` and `.split` fields, and the project type from `pre.chor`
  * `trajectory.type` is either "Swerve" or "Differential"
  * `trajectory.waypoints` is a list of timestamps with the same length as `snapshot.waypoints`. Its first element is 0 (seconds).
  * `trajectory.samples` is the list of samples
  * `trajectory.splits` is the sample index of every waypoint that starts a split segment. The end waypoint is not included, even if marked split. The start waypoint is always included, even if not marked split. Thus `trajectory.splits` always includes sample index 0 as its first element, and may have other elements.

* `events` is unchanged except that the marker target timestamps are updated as follows for each marker `marker`:
  * If `marker.from.target` (an index of `snapshot.waypoints`) is not None/undefined and is in bounds, `marker.from.target_timestamp = trajectory.waypoints[marker.from.target]`