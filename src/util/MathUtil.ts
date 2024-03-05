import { SavedTrajectorySample } from "../document/DocumentSpecTypes";

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

export type Pose = { x: number; y: number; rot: number };
export function storeToPose(store: SavedTrajectorySample) {
  return { x: store.x, y: store.y, rot: store.heading };
}
export function interpolate(p1: Pose, p2: Pose, frac: number) {
  const rot1 = p1.rot;
  const rot2 = p2.rot;

  const shortest_angle =
    ((((rot2 - rot1) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return {
    x: p1.x + frac * (p2.x - p1.x),
    y: p1.y + frac * (p2.y - p1.y),
    rot: p1.rot + frac * shortest_angle
  };
}
export function sample(
  timeSeconds: number,
  m_states: Array<SavedTrajectorySample>
): Pose {
  if (timeSeconds <= m_states[0].timestamp) {
    return storeToPose(m_states[0]);
  }
  if (timeSeconds >= m_states[m_states.length - 1].timestamp) {
    return storeToPose(m_states[m_states.length - 1]);
  }

  // To get the element that we want, we will use a binary search algorithm
  // instead of iterating over a for-loop. A binary search is O(std::log(n))
  // whereas searching using a loop is O(n).

  // This starts at 1 because we use the previous state later on for
  // interpolation.
  let low = 1;
  let high = m_states.length - 1;

  while (low !== high) {
    const mid = Math.floor((low + high) / 2);
    if (m_states[mid].timestamp < timeSeconds) {
      // This index and everything under it are less than the requested
      // timestamp. Therefore, we can discard them.
      low = mid + 1;
    } else {
      // t is at least as large as the element at this index. This means that
      // anything after it cannot be what we are looking for.
      high = mid;
    }
  }

  // High and Low should be the same.

  // The sample's timestamp is now greater than or equal to the requested
  // timestamp. If it is greater, we need to interpolate between the
  // previous state and the current state to get the exact state that we
  // want.
  const sample = m_states[low];
  const prevSample = m_states[low - 1];

  // If the difference in states is negligible, then we are spot on!
  if (Math.abs(sample.timestamp - prevSample.timestamp) < 1e-9) {
    return storeToPose(sample);
  }
  // Interpolate between the two states for the state that we want.
  return interpolate(
    storeToPose(prevSample),
    storeToPose(sample),
    (timeSeconds - prevSample.timestamp) /
      (sample.timestamp - prevSample.timestamp)
  );
}
