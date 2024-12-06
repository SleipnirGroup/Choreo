DELETE ME: https://github.com/SleipnirGroup/Choreo/compare/aec56d57fb78254fc9a8585bd31cdf5f4b6ceb07..f4c70fbb185f3ab823fbc6b229221cce55d0f770

(full diff)

# Choreo v2025.0.0-beta-7

Please read through the post entirely, since many breaking changes have been made.

# https://choreo.autos : New Docs Domain

We recently registered the domain `choreo.autos` to replace `sleipnirgroup.github.io/Choreo`. We have set up the latter to redirect to the former.  

# Document Schemas and Auto Upgrade

The version control in the .chor and .traj schemas is no longer a semver string. It is now an integer, starting at 1, and is different for .traj and .chor. A string in the `version` key is interpreted as version 0.

The Choreo app is able to automatically load non-current versions of both files (including existing files from beta-6) and upgrade them to the current schema. Depending on the changes being made between versions, this may additionally require regeneration; if so, that will be noted in the release post.

This is a feature Choreo had in 2024, but has been completely reimplemented.

For contributors, a guide to defining new schema versions has been added [here](https://choreo.autos/contributing/schema-upgrade/).

The three ChoreoLib languages will not automatically upgrade old trajectories when reading them.

# Removal of C++ AutoFactory API

Unfortunately, we found many severe bugs in our port of the Java AutoFactory API to C++, and decided to delete that attempt. We apologize for the inconvenience. 

# Breaking ChoreoLib Changes

See below for details on these changes.

## General
* Changes to how Choreo handles alliance flipping. See below.
## Raw API
### Trajectory
* [Java] `Trajectory.getInitialSample()`, `getFinalSample()`, `getInitialPose()`, `getFinalPose()`, `sampleAt()` now return `Optional<Pose2d>` instead of a potentially null `Pose2d`. This matches prior behavior of the other two languages (C++ with `std::optional` and Python with returning `None`)
* [C++] `Trajectory::GetInitialState()` is now `GetInitialSample()`.
* [Java, C++] `Trajectory.getInitialSample()/GetInitialSample()` and `getFinalSample()/GetFinalSample()` now take a `boolean` parameter that is true if the sample should be returned flipped. This does not check the current alliance; if the parameter is true, the sample will be flipped.
* [Java] `Trajectory.sampleArray()` has been removed due to causing runtime crashes and being type-unsafe.
### ProjectFile
The `cof` constructor parameter has been added, representing the wheel coefficient of friction.
## Java Auto API
### AutoLoop
* `choreo.auto.AutoLoop` is now `choreo.auto.AutoRoutine`.
    * `AutoFactory.newLoop()` and `voidLoop()` were renamed to `newRoutine()` and `voidRoutine()`.
* `AutoRoutine.cmd()` will end immediately with a warning if alliance flipping is enabled and the alliance is not known on command initialize.
* `AutoLoop.enabled()` was replaces with `AutoRoutine.running()`.
* `AutoLoop.poll()` will return immediately if the alliance is needed for flipping and not known. This is the same behavior as if `poll()` is called on a killed routine, or not while enabled and in autonomous.
### AutoTrajectory
* `AutoTrajectory.done()` behavior has changed. The trigger will become true for one cycle when the trajectory completes without being interrupted. Previously, interrupted trajectories would still fire the `done()` trigger.
* `AutoTrajectory.getInitialPose()` and `getFinalPose()` will now return `Optional.empty()` if alliance flipping is enabled and the alliance is not known.
* `AutoTrajectory.atPose(...)` now properly flips the target pose every time the Trigger is checked, based on the current alliance if alliance flipping is enabled. If the alliance is unknown and flipping is enabled, the Trigger will be false.
* `AutoTrajectory.atPose(Optional<Pose2d> pose, double toleranceMeters)` has been added. It will always return false if the parameter `pose` is empty. 
* `AutoTrajectory.atTimeAndPlace` has been renamed to `atTimeAndPose()`.
* `AutoTrajectory.collectEventPoses` now returns an `ArrayList<Supplier<Optional<Pose2d>>>` of poses that flip based on the current alliance and flipping enabled status.
### AutoFactory
* Choreo controller function now only takes a `SwerveSample` or `DifferentialSample`, not an additional `Pose2d` for the current pose.
* `AutoFactory.clearCache()` was replaced with `AutoFactory.cache().clear()` since the user can now access the trajectory cache.
### AutoChooser
* `AutoChooser`'s options are now functions that consume an `AutoFactory` and return an `AutoRoutine`, not a `Command`. Similarly, `AutoChooser.getSelectedAutoRoutine()` now returns an `AutoRoutine` instead of a `Command`. You can now use `AutoFactory.commandAsAutoRoutine(Command cmd)` as a utility method to return commands in the AutoChooser
* `AutoChooser` will only update if the DriverStation is connected (so that the alliance is known).

### Changes to alliance-based trajectory flipping

Several issues were identified with the way ChoreoLib, especially the Java higher-level API, handled alliance flipping, given that the alliance can change after auto routines are created, and the alliance can be unknown before the call of `autonmousInit`.

* The higher-level API now uses `Optional<Pose2d>` and `Supplier<Optional<Pose2d>>` instead of `Pose2d` in many places, to better represent poses that depend on the currently selected alliance.
* `AutoFactory`/`Choreo.createAutoFactory` no longer take a `BooleanSupplier mirrorTrajectory` that returns true when trajectories should be flipped. Instead they take a `BooleanSupplier useAllianceFlipping` to enable alliance-based flipping in general and a separate `Supplier<Optional<Alliance>>` that defaults to `DriverStation::getAlliance()`. The BooleanSupplier was moved elsewhere in the parameter list to force a compiler error.

# File Schema Changes
**.TRAJ SCHEMA VERSION:** 0

No changes except the "version" key being replaced with a 0 instead of a string. This does mean beta-6 ChoreoLib will not read beta-7 trajectories.

**.CHOR SCHEMA VERSION:** 1

Added wheel coefficient of friction `cof` as a robot configuration option. This helps constrain robot acceleration.

# Choreo Changes
* Files written by Choreo now end with a newline, as required by formatters like wpiformat.
* Fixed a bug with control interval guessing between two translation waypoints
* Added wheel coefficient of friction as a robot configuration option. This helps constrain robot acceleration.
* Reimplemented expression input boxes to fix bugs with undo histories
* Expression input and non-expression numerical input boxes no longer select all the contents when being edited.
* Changed "zone" to "region" in the text relating to keep-in and keep-out regions.
* Fixed a bug with .chor file saving that prevented some changes from triggering resaves, even though the file contents would have changed.
