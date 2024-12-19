// Copyright (c) Choreo contributors

package choreo.util;

import java.util.function.BiFunction;

/** A Choreo Internal utility class for array operations. */
public class ChoreoArrayUtil {
  /**
   * Checks two <code>double</code> arrays for equality with the given function. This returns true
   * if:
   *
   * <ul>
   *   <li>Either both arrays are null, or
   *   <li>Neither is null, the arrays are the same length, and the given function returns true for
   *       all same-index pairs of elements in the arrays.
   * </ul>
   *
   * @param arr1 The first array
   * @param arr2 The second array
   * @param check The function to compare elements.
   * @return Whether the arrays are equal.
   */
  public static boolean zipEquals(
      double[] arr1, double[] arr2, BiFunction<Double, Double, Boolean> check) {
    if (arr1 == null && arr2 == null) {
      return true;
    }
    if (arr1 != null && arr2 == null) {
      return false;
    }
    if (arr1 == null && arr2 != null) {
      return false;
    }
    // arr1 and arr2 both not null
    if (arr1.length != arr2.length) {
      return false;
    }
    for (int i = 0; i < arr1.length; ++i) {
      if (!check.apply(arr1[i], arr2[i])) {
        return false;
      }
    }
    return true;
  }
}
