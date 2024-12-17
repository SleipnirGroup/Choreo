# A Derivation of Sample Flipping

The logic for flipping both swerve and differential samples is derived below.

There are two kinds of flipping. One ("rotate around") is for rotationally symmetric fields, while the other ("mirror") reflects the field across the centerline parallel to both alliance walls. Mirroring can also be thought of as performing a "rotate" and then reflecting across the centerline perpendicular to both alliance walls.

Let FIELD_LENGTH be the distance between alliance walls, and FIELD_WIDTH be the distance between the long side walls.

We must preserve the following test points:

Original | Rotated | Mirrored | Notes
---------|--------|-|-
x = FIELD_LENGTH/2, y = FIELD_WIDTH/2 | unchanged | unchanged
x = 0, y = 0 | x = FIELD_LENGTH, y = FIELD_WIDTH | x = FIELD_LENGTH, y = 0
θ = 0 | π | π
θ = π/2 | 3π/2 | π/2
vx = 1 | vx = -1 | vx = -1
vy = 1 | vy = -1 | vy = 1
ω,α > 0 | ω,α > 0 | ω,α < 0 | Mirroring a CCW-spinning robot gives a CW-spinning robot.
vl = -1, vr = 1 | unchanged | vl = 1, vr = -1 | Derived from above.
fx, fy          | both negated | x negated
force left side | unchanged | flips to right side (FR, BR) | and vice versa left side, right side
