# Estimating and measuring Moment of Inertia (MoI)

The robot's rotational inertia has a significant impact on how quickly it can follow complex, twisty paths. For the best results, it is recommended to get as accurate an estimate of this parameter as possible.

In this section, we outline various approaches to determine a resonably accurate estimate of this key property.

This article is not intended to be an exhaustive list of ways to estimate MoI. In addition, some of these techniques may be less feasible for your team, depending on your team's unique resources and strengths.

## System Identification methods

If thorough System Identification has been performed, the system's MoI can be calculated from:

$$ I = \text{mass} * \dfrac{trackwidth}{2} * \dfrac{kA_\text{angular}}{kA_\text{linear}} $$

where $kA_\text{angular}$ is the angular acceleration feedforward constant of the drivetrain and $kA_\text{linear}$ is the linear acceleration feedforward constant.

## Assuming a simplified mass distribution

If the robot is considered a solid rectangular plate of uniformly-distributed mass, its MoI would be:

$$ I = \dfrac{1}{12} * \text{mass} * (\text{length}^2 + \text{width}^2) $$

However, this would likely be an underestimate because most FRC robots tend to have mass concentrations (e.g. swerve modules) located along the frame perimeter, and are otherwise relatively hollow.

A better estimate could by found by summing each subsystem's contributions to the robot's overall MoI, based on its mass and average distance from the axis of rotation:

$$ I = \sum_{i=1}^n \text{mass}_\text{subsystem i} * \text{radius}_\text{subsystem i}^2 $$

## Faithful CAD loaded with mass properties

Most popular CAD tools can calculate the mass properties of solid modeled objects. However, a disciplined approach to CAD work is required for these values to be accurate.

<figure markdown>
![REV-2024-starterBot-massProps](../media/REV-2024-starterBot-massProps.png){ width="600" }
    <figcaption>[2024 REV ION FRC Starter Bot](https://www.revrobotics.com/ion/frc-starter-bot-24/)</figcaption>
</figure>

## Physical experimentation

The MoI of irregular objects can be determined experimentally using the bifilar (two wire) vertical axis torsional pendulum method.

<figure markdown>
![bifilar-torsional-pendulum](../media/bifilar-torsional-pendulum.png){ width="400" }
    <figcaption>Mathworks, [Improving Mass Moment of Inertia Measurements](https://www.mathworks.com/company/newsletters/articles/improving-mass-moment-of-inertia-measurements.html)</figcaption>
</figure>

This experiment requires suspending your robot from an overhead support by a pair of parallel strings. Then, after providing an initial push, the frequency of the oscillation is measured by counting the number of swings in a given period.

!!! warning

    Robots are heavy and may fall. Do not suspend robots from an acoustic drop ceiling system, such as you'd find in a classroom. In general, we recommend that you get permission from the building owner before making any attachment to walls, floors, and ceilings, even temporarily.

!!! tip

    If suspending the robot from a ceiling is not feasible, consider constructing a freestanding gantry for this purpose. A typical playground swingset is likely to provide adequate support, and many suitable plans for swingsets can be found on the internet.

A detailed experimental procedure is given in [The Experimental Determination of the Moments of Inertia of Airplanes by a Simplified Compound-Pendulum Method](https://ntrs.nasa.gov/citations/19930082299), NACA Technical Note No. 1629.

<figure markdown>
![NACA-TN-1629-figure3](../media/NACA-TN-1629-figure3.png){ width="400" }
    <figcaption>NACA Technical Note No. 1629, p.26</figcaption>
</figure>
