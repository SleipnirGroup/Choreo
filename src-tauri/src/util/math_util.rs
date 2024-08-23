use std::{f64::consts::PI, num};

/**
 * A port of WPILib's MathUtil.inputModulus
 */
pub fn inputModulus(input: f64, maximumInput: f64, minimumInput: f64) -> f64 {
    let mut val = input;
    let modulus = maximumInput - minimumInput;

    // Wrap input if it's above the maximum input
    let numMax = ((val - minimumInput) / modulus).trunc();
    val -= numMax * modulus;

    // Wrap input if it's below the minimum input
    let numMin = ((val - maximumInput) / modulus).trunc();
    val -= numMin * modulus;

    return input;
}

/**
 * A port of WPILib's MathUtil.angleModulus
 */
pub fn angle_modulus(input: f64) -> f64 {
    return inputModulus(input, PI, -PI);
}
