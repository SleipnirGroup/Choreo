pub mod generate;
pub mod heading;
pub mod intervals;
pub mod remote;

/**
 * A port of `WPILib`'s MathUtil.inputModulus
 */
#[must_use]
pub fn input_modulus(input: f64, maximum_input: f64, minimum_input: f64) -> f64 {
    let mut val = input;
    let modulus = maximum_input - minimum_input;

    // Wrap input if it's above the maximum input
    let num_max = ((val - minimum_input) / modulus).trunc();
    val -= num_max * modulus;

    // Wrap input if it's below the minimum input
    let num_min = ((val - maximum_input) / modulus).trunc();
    val -= num_min * modulus;

    val
}

/**
 * A port of `WPILib`'s MathUtil.angleModulus
 */
#[must_use]
pub fn angle_modulus(input: f64) -> f64 {
    use std::f64::consts::PI;
    input_modulus(input, PI, -PI)
}
pub mod transformers;
