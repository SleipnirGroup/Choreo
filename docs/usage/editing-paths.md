Choreo finds the [mathematically optimal](https://en.wikipedia.org/wiki/Mathematical_optimization) trajectory that passes through your waypoints, subject to your drivetrain's constraints. It also allows fine-grained customization while still maintaining concrete stability. This allows for smoother paths and better odometry.

## Waypoints

![pose, translation, and empty waypoints](../media/waypoint-types.png)

Waypoints are an ordered position that you'd like to hit on your path. There are multiple types of waypoints based on what you'd like to constrain in your path.

To add a waypoint, select the type of waypoint from the waypoints navbar on the top to get started, then click on the field where you want it. Your waypoints will show up on the sidebar. A yellow dot represents the currently selected waypoint, green for the starting waypoint, and red for the ending waypoint.

![waypoints navbar](../media/waypoints+navbar.png)

### Pose Waypoints

Pose Waypoint is the first button on the waypoints navbar and consists of a translation **and** a rotation. Drag the little yellow triangle to change the heading.

- **X and Y**: position from the bottom left corner of the field (origin)
- **θ**: Robot heading, with 0 to the right (towards the positive field X)

### Translation Waypoints

Translation Waypoint is the second button on the waypoints navbar and consists of a translation but not a rotation.

- **X and Y**: position from the origin

### Empty Waypoint

Empty Waypoint is the third button on the waypoints navbar. It does not directly constrain translation or rotation. However, other constraints such as Keep-In or Point-At can apply to it. It is also used to form the initial shape of the path.

- **X and Y**: position from the origin

## Constraints

Constraints are limitations that the optimizer needs to respect while generating a path.

### Scopes

Different constraints can be applied in different scopes or ranges.

#### Waypoint Scope

Applies this constraint at the selected waypoint.

#### Segment Scope

Applies this constraint to the range of the trajectory between two waypoints.

#### Waypoint + Segment Scope

Some constraints can be applied to both individual waypoints and segments.

### Adding Constraints

TODO: video

To add a constraint, select it from the top navbar. Click the waypoint at one end of the constraint's range. For Segment scope constraints, a dashed line will follow your cursor. If you hover over another waypoint, the line will go through all the waypoints in the range. Click the second waypoint to add the constraint.

> NOTE: If adding a Waypoint + Segment scope constraint to a single waypoint, you will have to click the same waypoint twice.

### Constraint Display

When a constraint is selected in the sidebar, circles and dashed lines will show the range of waypoints under the constraint.

![Display of the scope of a constraint](../media/constraint-scope-line.png)

Some constraints have field points or regions associated with them. When these constraints are selected, the field will display movable points and shapes to define these regions.

## Keep Out Constraints

Keep out constraints force the robot to avoid a certain area of the field throughout the path. For example, in the 2023 Charged Up game, you might want to avoid crashing into the charge station. Keep out constraints makes it easy to define where you want the robot to start and end without unnecessary (and performance-impacting) intermediary waypoints.
!!! warning keep out constraints can cause weird behaviours when generating paths due to known issues with the numerical solver used for Choreo. This can be avoided using intermediary waypoints.

To add a keep out circle:

1. Select the keep out circle from the navbar (looks like a circle with a slash through it).
2. Select anywhere on the field to add an obstacle. You can click on the ends of the circle to resize them. You can also use the info panel on top left of the field to edit the center x, center y, and circle radius.

![Keep out constraints](../media/obstacles.png)

## Event Markers

For teams that use the PathPlannerLib interoperability to follow Choreo paths, Choreo offers event marker support to trigger commands during the path.

![Event Markers and Command Bindings](../media/event-markers.png)

Event markers in Choreo are placed based on time offset before/after a specified waypoint. Add a marker by selecting the event marker on the navbar and clicking on the targeted waypoint. The target can be changed similarly to a constraint.

When the trajectory is (re)generated, the marker will appear at the proper timestamp and be exported to the .traj file.

Changes to the time offset will reflect in the .traj file immediately, relative to the timestamp of the targeted waypoint as of the last generation.
!!!tip You can see the waypoints as they were in the last generation by turning on the "Samples" view layer. You can then turn off "Waypoints" if the current waypoints obstruct the small waypoints from the "Samples" layer.
![Samples view layer showing ](../media/samples-layer-wpts.png)

Changes to the targeted waypoint will not reflect until trajectory regeneration.

Changes to the marker name are not part of the trajectory, so will not trigger updates to the .traj file.

The options for binding commands to markers mirror PathPlanner's functionality. Named commands use the same registry of names that PathPlanner markers use. However, there is currently no autofill menu with the existing command names. Changes to the command reflect immediately in the .traj.

There are a few reasons why event markers might not export. These will be shown with a **!** next to the marker in the sidebar.

![Event Marker sidebar showing error](../media/event-marker-error.png)

1. There is a stop point (including the path endpoints) between the targeted waypoint and the marker's actual timestamp.
2. The marker targets a waypoint that has been deleted. You need to select another waypoint in the marker config panel.
3. The path had been modified between the last generation and adding the marker, so Choreo can't give the marker a proper timestamp. Regenerate the path.

## Generating

You can create paths by chaining waypoints together. Check out [Controls & Shortcuts](./controls-shortcuts.md) for advanced controls. Once you have at least two waypoints, then you can generate a path.

!!! tip
    You can cancel the path generation by pressing control and clicking the red "X" once it has started.

!!! tip
    If there is an error generating a path, check to make sure your waypoints can physically work.

![Generating Path Gif](../media/generating_path.gif)
