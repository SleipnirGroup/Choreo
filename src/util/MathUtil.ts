/**
 * A port of WPILib's MathUtil.inputModulus
 */
export function inputModulus(
  input: number,
  maximumInput: number,
  minimumInput: number
) {
  const modulus = maximumInput - minimumInput;

  // Wrap input if it's above the maximum input
  const numMax = Math.trunc((input - minimumInput) / modulus);
  input -= numMax * modulus;

  // Wrap input if it's below the minimum input
  const numMin = Math.trunc((input - maximumInput) / modulus);
  input -= numMin * modulus;

  return input;
}

/**
 * A port of WPILib's MathUtil.angleModulus
 */
export function angleModulus(input: number) {
  return inputModulus(input, Math.PI, -Math.PI);
}
