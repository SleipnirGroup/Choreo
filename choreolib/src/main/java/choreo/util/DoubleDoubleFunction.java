package choreo.util;

@FunctionalInterface
public interface DoubleDoubleFunction {

    /**
     * Applies this function to the given argument.
     *
     * @param value the function argument
     * @return the function result
     */
    double apply(double value);
}
