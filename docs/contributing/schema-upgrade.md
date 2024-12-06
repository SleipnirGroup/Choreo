# Changing the Choreo Data Objects

Occasionally it is necessary to add something to the Choreo data objects. This document serves as a checklist for defining a new schema version.

> This document only discusses adding new fields to the existing objects. For example, adding new constraints uses a system not entirely described by this document.
This document is also not meant to capture every place that depends on a given struct.

## Capturing .chor and .traj from before the change

### Add project and trajectory files pre-change to `./test-jsons`.

To facilitate unit testing, Choreo keeps a copy of project and trajectory files from each schema version. These are stored in the test-jsons directory and organized first by file type, then by version.

For a version number `n`, the structure is
```
test-jsons/
    project/
        n/
            differential.chor
            swerve.chor
    trajectory/
        n/
            differential.traj
            swerve.traj

```
The contents of these files should include enough of Choreo's features to test the upgrader thoroughly, since version upgrade changes that don't apply to the test file don't get well-tested. The trajectories should be generated.


## src-core
### Make the desired change in `src-core/src/spec/project.rs` and/or `src-core/src/spec/trajectory.rs` as needed.
Note that in Rust, the `#[serde(rename_all = "camelCase")]` macros mean that the Rust struct name is `snake_case`, while in JSON serialization and in the TypeScript mirrors of the Rust structs, the name is `camelCase`.

### If editing the project schema, update the default file
This is in `src-core/src/spec/project.rs::default()`. Update it by manually making the change with reasonable default values. Rust may enforce this step with an error, depending on the change being made.

### Increment the correct schema version
This is either `PROJECT_SCHEMA_VERSION` or `TRAJ_SCHEMA_VERSION`, in `src-core/src/spec/mod.rs`. The previous and new versions shall be referred to as `PREV_VERSION` and `NEW_VERSION` in documentation below.

### Write an upgrade function for the new schema.

Upgrade functions are Rust functions that operate on the JSON object of the file. The upgrade functions and their tests are in `src-core/src/spec/upgraders.rs`. Refer to existing upgrade functions or `src-core/src/file_management/upgrader.rs::Editor` for details. Here are two examples:

```rs
// Naming convention: up_[PREV_VERSION]_[NEW_VERSION]
// Function signature (&mut Editor) -> ChoreoResult<()>
fn up_0_1(editor: &mut Editor) -> ChoreoResult<()> {
    // Check if the file has a particular sub-object
    if editor.has_path("trajectory") {
        // Set an existing or nonexisting field
        editor.set_path("trajectory.trackwidth", 1.0)
    } else {
        Ok(())
    }
}

fn up_0_1(editor: &mut Editor) -> ChoreoResult<()> {
    // Set the value of some field with the serialization of the argument
    editor.set_path_serialize("config.cof", Expr::new("1.5", 1.5))
}
```

Ensure that any errors returned from the `Editor` calls are returned from the upgrader function before proceeding with the rest of the function.
### Add the upgrader function to the upgrader

In `upgraders.rs`, after adding the new upgrader function, add a line like
```rs
upgrader.add_version_action(up_[PREV_VERSION]_[NEW_VERSION]);
```
in `make_upgrader()` AFTER all existing `upgrader.add_version_action(...)` calls.

### Make tests for the new upgrade function
Create unit tests that load the files previously captured in `test-jsons` and upgrade them to the current version.
* In `upgraders.rs`, tests for the upgrade functions are within each sub-module (`project_file` and `traj_file`).
* Copy and paste an existing block of two tests and change the version number.
* Run tests to ensure the upgrader is working correctly.

## src (Typescript UI source)

### Make changes to the data objects in `src/document/2025/DocumentTypes.ts`

There is a mirror for every Rust struct that gets serialized. Note again that in TS, the fields are in `camelCase`.

### Update any usages of those objects in the Typescript source

Some objects have default values stored throughout the code.

### Update the relevant schema version in `src/document/2025/DocumentTypes.ts`

### Update the Mobx store for the modified data struct.

These are in `src/document/`.

#### Properties
Each store has a `.model` section showing the properties of the Mobx object. Usually these should match the data objects, but this is up to the needs of the implementation.

#### `get serialize()`
Each store has a `get serialize()` computed property. This needs to be updated to populate the data struct with the new field. Usually this is a straightforward assignment operator for primitive fields or a call of `serialize()` on child stores, but some stores have more bespoke serialization.

#### `deserialize()`
Each store has a `deserialize()` which populates the Mobx store from a data object.

## Choreolib

Update TRAJ_SCHEMA_VERSION and PROJECT_SCHEMA_VERSION in the following:
* Python: `choreolib/py/choreo/__init__.py`
* Java: `choreolib/src/main/java/choreo/Choreo.java`
* C++: `choreolib/src/main/native/include/choreo/Choreo.h`

Make any functional changes to the trajectory classes and loading methods in all three languages, according to the schema change being made.
