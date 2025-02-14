Choreo finds the [mathematically optimal](https://en.wikipedia.org/wiki/Mathematical_optimization) trajectory that passes through your waypoints, subject to your drivetrain's constraints. It also allows fine-grained customization while still maintaining concrete stability. This allows for smoother paths and better odometry.

## Waypoints

![pose, translation, and empty waypoints](../media/waypoint-types.png)

Waypoints are an ordered position that you'd like to hit on your path. There are multiple types of waypoints based on what you'd like to constrain in your path.

To add a waypoint, select the type of waypoint from the waypoints navbar on the top to get started, then click on the field where you want it. Your waypoints will show up on the sidebar. A yellow dot represents the currently selected waypoint, green for the starting waypoint, and red for the ending waypoint.

To change the type of an existing waypoint, use the options on the waypoint configuration panel, under the X, Y, and θ
!!! tip
    Use the keys `1`, `2`, and `3` to select the pose, translation, and empty waypoints for adding.

![waypoints navbar](../media/waypoints+navbar.png)

### Pose Waypoints

Pose Waypoint is the first button on the waypoints navbar and consists of a translation **and** a rotation. This signifies that at this waypoint, the robot's translation and heading exactly match the waypoint.

Drag the little triangle to change the heading. The robot faces in the direction the triangle is pointing.

- **X and Y**: position from the bottom left corner of the field (origin)
- **θ**: Robot heading, with 0 to the right (towards the positive field X)

### Translation Waypoints

Translation Waypoint is the second button on the waypoints navbar and consists of a translation but not a rotation. Use this waypoint if the robot's heading is driven by a different constraint, or if it should be left up to the optimizer.

- **X and Y**: position from the origin
- **θ**: Not used, but shows the heading as if the waypoint was a Pose Waypoint.

### Empty Waypoint

Empty Waypoint is the third button on the waypoints navbar. It does not directly constrain translation or rotation. However, other constraints such as Keep-In or Point-At can apply to it. It is also used to form the initial shape of the path around obstacles.

- **X and Y**: position from the origin
- **θ**: Not used, but shows the heading as if the waypoint was a Pose Waypoint.

!!! note
    Empty waypoints cannot be the endpoint of a path.

### Waypoint Configuration Panel

![Waypoint Configuration Panel](../media/waypoint_config_panel.png)

This panel appears in the top left corner of the field when a waypoint is selected.

The checkbox next to the "Samples" input enables an override for the number of samples between this waypoint and the next.

The "Split" checkbox splits the path at this waypoint. Split sections can be accessed individually in ChoreoLib.

The waypoint type selector changes the type of this waypoint.

!!! tip
    Use `Shift+1`, `Shift+2`, `Shift+3` to change the type of the currently selected waypoint.

## Constraints

Constraints are limitations that the optimizer needs to respect while generating a path.

These are applied in addition to the waypoints, and can sometimes conflict with the waypoints or each other. In some cases, Choreo will detect conflicts and fail generation early with a warning.

### Scopes

Different constraints can be applied in different scopes or ranges of the trajectory.

#### Waypoint Scope

Applies this constraint at the selected waypoint.

#### Segment Scope

Applies this constraint to the range of the trajectory between two waypoints, including the end waypoints.

#### Waypoint + Segment Scope

Some constraints can be applied to both individual waypoints and segments.

#### Targets
The endpoints of any given scope can be tied to a particular waypoint (and follow that waypoint as it's reordered), the first waypoint in the path, or the last waypoint in the path.

### List of Constraints

![Constraint navbar](../media/constraint_navbar.png)
From left to right:

1. **Stop Point** (Waypoint): Constrains linear and angular velocity to 0 at the waypoint.
2. **Max Velocity** (Both): Limits the maximum chassis velocity throughout the scope.
    * Max Velocity equal to 0 on a segment will cause a generation failure.
3. **Max Acceleration** (Both): Limits the maximum chassis acceleration throughout the scope.
4. **Max Angular Velocity** (Both): Limits the maximum chassis angular velocity throughout the scope.
    * Max Angular Velocity equal to 0 with multiple Pose waypoints in the scope will fail with a warning, even if the Pose headings are identical
    * Max Angular Velocity equal to 0 with one Pose waypoint and some Translation or Empty waypoints can be used instead.

The following 5 constraints all have draggable shapes on the field tied to their configuration, which are visible when the constraint is selected in the sidebar. These shapes generally appear in the lower left corner of the field when the constraint is added.

5. **Point At** (Both): Forces the the robot to face its front or back to a given point, within a given tolerance.
    * When added, a target shape appears at (0,0) and can be moved to the desired facing point.
    * Any Pose waypoint within the scope of this constraint will fail with a warning.
6. **Keep In Circle** (Both): Keeps all corners of the bumpers inside the circle.
    * Be mindful of small regions or waypoints close to the edge of the region, as they can easily cause constraint conflicts.
7. **Keep In Rectangle** (Both): Keeps all corners of the bumpers inside the rectangle.
    * A Keep In Rectangle matching the field wall dimensions is added by default on every new path.
8. **Keep In Lane** (Segment): Keeps the **center** of the robot within a given distance of the line between the two end waypoints.
    * This is used primarily to make the robot go in a mostly straight line.
    * If there are intermediate waypoints, the lane still goes straight between the start and end of the constraint range.
9. **Keep Out Circle** (Both): Keep all portions of the bumper outside of the circle.
    * See "Keep Out Regions" below.

### Adding Constraints

To add a constraint, select it from the top navbar. Click the waypoint at one end of the constraint's range. For Segment scope constraints, a dashed line will follow your cursor. If you hover over another waypoint, the line will go through all the waypoints in the range. Click the second waypoint to add the constraint.

!!! note
    If adding a Waypoint + Segment scope constraint to a single waypoint, you will have to click the same waypoint twice.

### Constraint Display

When a constraint is selected in the sidebar, circles and dashed lines will show the range of waypoints under the constraint.

![Display of the scope of a constraint](../media/constraint-scope-line.png)

Some constraints have field points or regions associated with them. When these constraints are selected, the field will display movable points and shapes to define these regions.

### Constraint Configuration Panel

The constraint configuration panel appears in the top left of the field when a constraint is selected.

![Constraint config panel](../media/constraint_config_panel.png)

All constraints will have a scope slider at the top. Use this to change the scope of the constraint.

Below the scope slider are various inputs specific to each constraint. Read the tooltips by hovering over the title of each input to learn more.

## Keep Out Regions

Keep out regions force the robot to avoid a certain area of the field throughout the path. For example, in the 2024 Crescendo game, you might want to avoid crashing into the stage pillars. Keep out constraints define a region instead of a path, and let the optimizer find the best path around the region.

!!! warning
    Keep Out Regions can cause weird behaviours when generating paths due to known issues with the numerical solver used for Choreo. See the tips below for best results.

!!! tip
    1. Use empty waypoints to make the initial shape of the path avoid the keep-out-region.
    2. Drag the empty waypoints farther away from the region. This gives the path more detail and an initial shape that has room to shrink towards the boundary.
    3. Minimize use of the keep-out region. Don't add every obstacle on the field to every path. If possible, restrict the constraint to only the portion of the trajectory that might collide.

![Keep out constraints](../media/keep_out_circle.png)

## Event Markers

Event Markers are a way to mark timestamps during a path for use in ChoreoLib or PathplannerLib.

![Event Markers and Command Bindings](../media/event-markers.png)

In ChoreoLib, markers can be used with the Java AutoTrajectory API in `AutoTrajectory.atTime(String)` ([Javadoc](/api/choreolib/java/choreo/auto/AutoTrajectory.html#atTime(java.lang.String))) and similar.

For teams that use the PathPlannerLib interoperability to follow Choreo paths, Choreo offers event marker support to trigger commands during the path. Though Choreo's process for positioning markers is different than PathPlanner, the process for attaching a command to a marker is very similar.

!!! note
    Choreo does not support PathPlanner zoned events.

Event markers in Choreo are placed based on time offset before/after a specified waypoint. Add a marker by selecting the event marker on the navbar and clicking on the targeted waypoint. The target can be changed similarly to a constraint.

When the trajectory is (re)generated, the marker will appear at the proper timestamp and be saved to the .traj file.

Changes to the time offset will reflect in the .traj file immediately, relative to the timestamp of the targeted waypoint as of the last generation.
!!! tip You can see the waypoints as they were in the last generation by turning on the "Samples" view layer. You can then turn off "Waypoints" if the current waypoints obstruct the small waypoints from the "Samples" layer.
![Samples view layer](../media/samples-layer-wpts.png)

Changes to the targeted waypoint will not reflect until trajectory regeneration.

### PathPlanner Interop
The options for binding commands to markers mirror PathPlanner's functionality. Named commands use the same registry of names that PathPlanner markers use. However, there is currently no autofill menu with the existing command names. Changes to the command reflect immediately in the .traj.

## Generating

You can create paths by chaining waypoints together. Check out [Controls & Shortcuts](./controls-shortcuts.md) for advanced controls. Once you have at least two waypoints, then you can generate a path.

!!! tip
    You can cancel the path generation by pressing control and clicking the red "X" once it has started.

!!! tip
    If there is an error generating a path, check to make sure your waypoints can physically work.

!!! tip
    If there is an error generating a path, check to make sure your config units are correct.

![Generating Path Gif](../media/generating_path.gif)
