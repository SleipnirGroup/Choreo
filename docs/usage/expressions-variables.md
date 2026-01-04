# Expressions and Variables

The Choreo GUI uses a mathematical expression parser (https://mathjs.org/) in nearly every number input. This has several benefits over a plain number input:

* Warnings for incorrect dimensions in inputs (i.e. an angle in a length field)
* Use of any appropriate unit in inputs, instead of having to convert to SI units.
* Addition of different units of the same dimension; `2 m + 1 in` is a valid length input.
* Use of a set of pre-provided mathematical functions within the expression
* Ability to define variables that can be referenced throughout the project.

## Expressions

Every expression input has an associated dimension. Some are length inputs, some are angle inputs, etc. Some are dimensionless, meaning they accept an expression without units or one where the units cancel out.

> NOTE: Due to limitations in the parser, radians (`rad`) is an angle unit, not a dimensionless expression.

These are all the dimensions supported by expression inputs:
* Number (Dimensionless)
* Length
* Linear Velocity
* Linear Acceleration
* Angle
* Angular Velocity
* Angular Acceleration
* Time
* Mass
* Torque
* Moment of Inertia

The units supported by the expression parser can be found [here](https://mathjs.org/docs/datatypes/units.html#reference) with the following Choreo-specific additions:
* RPM (alias rpm), angular velocity equal to `cycle / minute`

## Variables

Choreo also allows users to define a project-wide set of expressions that can be referenced as variables in any input. 

### The Variables Panel

### Adding Variables

### Using Variables

### Renaming Variables



