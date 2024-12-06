DELETE ME: https://github.com/SleipnirGroup/Choreo/compare/aec56d57fb78254fc9a8585bd31cdf5f4b6ceb07..f4c70fbb185f3ab823fbc6b229221cce55d0f770

(full diff)

# Choreo v2025.0.0-beta-7

This is a major beta update, so please read through the post entirely.

## https://choreo.autos : New Docs Domain

We recently registered the domain `choreo.autos` to replace `sleipnirgroup.github.io/Choreo`. We have set up the latter to redirect to the former.  

## Document Schemas and Auto Upgrade

The version control in the .chor and .traj schemas is no longer a semver string. It is now an integer, starting at 1, and is different for .traj and .chor. A string in the `version` key is interpreted as version 0.

The Choreo app is able to automatically load non-current versions of both files (including existing files from beta-6) and upgrade them to the current schema. Depending on the changes being made between versions, this may additionally require regeneration; if so, that will be noted in the release post.

For contributors, a guide to defining new schema versions has been added [here](https://choreo.autos/contributing/schema-upgrade/).

The three ChoreoLib languages will not automatically upgrade 

## Removal of C++ AutoFactory API

Unfortunately, we found many severe bugs in our port of the Java AutoFactory API to C++, and decided to delete that attempt. We apologize for the inconvenience. 

## Breaking ChoreoLib Changes

See below for details on these changes.

* `choreo.auto.AutoLoop` is now `choreo.auto.AutoRoutine`.
    * `AutoFactory.newLoop()` and `voidLoop()` were renamed to `newRoutine()` and `voidRoutine()`.
* Choreo controller function now only takes a `SwerveSample` or `DifferentialSample`, not an additional `Pose2d` for the current pose.
* Changes to how Choreo handles alliance flipping
    * Use of `Optional<Pose2d>` and `Supplier<Optional<Pose2d>>` instead of `Pose2d`, to better represent poses that depend on the currently selected alliance. See below.
* `AutoChooser`'s options are now functions that consume an `AutoFactory` and return an `AutoRoutine`, not a `Command`. Similarly, `AutoChooser.getSelectedAutoRoutine()` now returns an `AutoRoutine` instead of a `Command`. You can use `AutoFactory.commandAsAutoRoutine`
* `AutoChooser` will only update if the DriverStation is connected (so that the alliance is known).
* `AutoChooser.getSelectedAutoRoutine`

### AutoLoop Renamed to AutoRoutine

`choreo.auto.AutoLoop` is now `choreo.auto.AutoRoutine`.

This better reflects the intent that one instance of the class represents one entire autonomous routine. The Loop name derived from WPILib's `EventLoop`, but 

### Transition to late-evaluated flipped poses

Several issues were identified with the way ChoreoLib handled alliance flipping, given that the alliance can change after auto routines are created, and the alliance can be unknown before the call of `autonmousInit`.

### Choreo Control Function Signature Change

Formerly, the control function passed to `Choreo.createAutoFactory()` had the signature `(Pose2d currentPose, TrajectorySample sample)->void`. In beta 7, the function should retrieve its own current drivetrain pose, and the signature is simply `(TrajectorySample sample)->void`. The `poseSupplier` argument is currently used only for `atPose` triggers 

