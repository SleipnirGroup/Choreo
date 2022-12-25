# Document Specification

## File Format

A __Document__ is text in the [JSON](https://www.ecma-international.org/publications-and-standards/standards/ecma-404/) format complying with a version of this specification.

## JSON

The document is a JSON object. The document may contain additional data outside of the specification.

This specification uses templates to express the necessary parts of the __Document__. `<>` may be used to indicate a part of the JSON that has not yet been specified or contains user-defined data.

Here are the user-defined data expressions:

* `<number>` indicates an arbitrary number.
* `<positive-number>` indicates an arbitrary number greater than or equal to `0`.
* `<boolean>` indicates an arbitrary boolean.
* `<integer>` indicates as an integer number.
* `<positive-integer>` indicates as an integer number greater than or equal to `0`.

## Version

There are multiple versions of this specification, each of which has a unique identifying string, such as `v0.0.0`. A __Document__ must contain a string field named `version`, containing this unique version. Each version of the specification will be amended to this document as necessary.

### Names

All names are strings that must have no beginning or trailing whitespace and be composed of only alphanumeric characters, `-`, and `_`.

## Specifications

### v0.0.0

A version `v0.0.0` __Document__ must fit this template:

```json
{
    "version": "v0.0.0",
    "paths": <paths>,
    "robotConfiguration": {
        "mass": <positive-number>,
        "rotationalInertia": <positive-number>,
        "wheelbase": <positive-number>,
        "trackWidth": <positive-number>,
        "wheelRadius": <positive-number>,
        "wheelMaxVelocity": <positive-number>,
        "wheelMaxTorque": <positive-number>
    }
}
```

`<paths>` is an object containing at least one arbitrarily named field. Each field's name is the name of the __Path__, and its value is the __Path__. For example, if a document contains two paths named `path1` and `path2`, `<paths>` would follow this template:

```json
{
    "path1": <path1>,
    "path2": <path2>
}
```

A __Path__ must comply with this template:

```json
{
    "waypoints": <waypoint-list>,
    "trajectory": <generated-trajectory>
}
```

`<waypoint-list>` is an array of __Waypoints__. A __Waypoint__ must comply with this template:

```json
{
    "x": <number>,
    "y": <number>,
    "heading": <number>,
    "velocityMagnitude": <number>,
    "velocityAngle": <number>,
    "xConstrained": <boolean>,
    "yConstrained": <boolean>,
    "headingConstrained": <boolean>,
    "velocityMagnitudeConstrained": <boolean>,
    "velocityAngleConstrained": <boolean>,
    "controlIntervalCount": <positive-integer>
}
```

`<generated-trajectory>` may either be `null` or a __Trajectory__, which is an array of __Trajectory Samples__. A __Trajectory Sample__ must comply with this template:

```json
{
    "timestamp": <timestamp>,
    "x": <number>,
    "y": <number>,
    "heading": <number>,
    "velocityX": <number>,
    "velocityY": <number>,
    "angularVelocity": <number>
}
```

Within a __Trajectory__, `<timestamp>` is a positive number that must be `0` for the first __Trajectory Sample__ and greater than the previous sample for the remaining samples.
