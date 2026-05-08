package choreo.auto;

import choreo.Choreo;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import org.wpilib.annotation.NoDiscard;
import org.wpilib.command3.Command;
import org.wpilib.command3.Coroutine;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.StateMachine;

import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * A variant of {@link StateMachine} that supports interop with choreo trajectories.
 */
public class ChoreoStateMachine implements Command {
    @NoDiscard
    public interface State {
        StateMachine.State backingState();

        /**
         * Adds a function to be called when this state is entered. Callbacks are invoked immediately
         * after the state's command is scheduled, and are run in the same order they were added.
         *
         * <p>Note: if a callback schedules any commands, those commands will be scoped to the lifetime
         * of the entire state machine, <i>not</i> this state's lifetime.
         *
         * @param callback The callback to run. Cannot be null.
         */
        default void onEnter(Runnable callback) {
            backingState().onEnter(callback);
        }

        /**
         * Adds a function to be called when this state is exited. Callbacks are invoked immediately
         * before the state's command is canceled, and are run in the order they were added. If the
         * command finishes naturally, the callbacks are run immediately after it completes and before
         * the next state is entered.
         *
         * @param callback The callback to run. Cannot be null.
         */
        default void onExit(Runnable callback) {
            backingState().onExit(callback);
        }

        /**
         * Starts building a transition to the specified state.
         *
         * @param to The state to transition to. Cannot be null.
         * @return A builder for the transition.
         */
        default StateMachine.TransitionNeedsConditionStage switchTo(State to) {
            return backingState().switchTo(to.backingState());
        }

        /**
         * Starts build a transition to some dynamic state. The supplier will be evaluated at the time
         * the transition's condition is met.
         *
         * @param dynamic The dynamic state supplier. Cannot be null.
         * @return A builder for the transition.
         */
        default StateMachine.TransitionNeedsConditionStage switchTo(Supplier<State> dynamic) {
            return backingState().switchTo(() -> dynamic.get().backingState());
        }

        /**
         * Starts building a transition that will exit the state machine when triggered, rather than
         * moving to a different state.
         *
         * @return A builder for the transition.
         */
        default StateMachine.TransitionNeedsConditionStage exitStateMachine() {
            return backingState().exitStateMachine();
        }
    }

    public static class TrajectoryState extends AutoTrajectory implements State {
        private final StateMachine.State backingState;
        private final StateMachine stateMachine;
        private final boolean shouldResetOdometry;

        @SuppressWarnings("unchecked")
        <SampleType extends TrajectorySample<SampleType>> TrajectoryState(
            AutoTrajectory traj,
            StateMachine stateMachine,
            boolean shouldResetOdometry
        ) {
            super(
                traj.name,
                (Trajectory<SampleType>) traj.trajectory,
                traj.poseSupplier,
                traj.resetOdometry,
                (Consumer<SampleType>) traj.controller,
                traj.allianceCtx,
                (Choreo.TrajectoryLogger<SampleType>) traj.trajectoryLogger,
                traj.driveMechanism,
                traj.bindings
            );
            var command = shouldResetOdometry
                ? resetOdometry().andThen(cmd()).withAutomaticName()
                : cmd();
            this.backingState = stateMachine.addState(command);
            this.stateMachine = stateMachine;
            this.shouldResetOdometry = shouldResetOdometry;
        }

        @Override
        public TrajectoryState mirrorX() {
            return new TrajectoryState(super.mirrorX(), stateMachine, shouldResetOdometry);
        }

        @Override
        public TrajectoryState mirrorY() {
            return new TrajectoryState(super.mirrorY(), stateMachine, shouldResetOdometry);
        }

        @Override
        public TrajectoryState rotateAround() {
            return new TrajectoryState(super.rotateAround(), stateMachine, shouldResetOdometry);
        }

        public TrajectoryState withOdometryReset() {
            return new TrajectoryState(this, stateMachine, true);
        }

        @Override
        public StateMachine.State backingState() {
            return backingState;
        }
    }

    private final StateMachine stateMachine;
    private final AutoFactory factory;

    /**
     * Creates a new state machine.
     *
     * @param name The name of the state machine.
     * @param factory The auto factory being utilized.
     */
    ChoreoStateMachine(String name, AutoFactory factory) {
        this.stateMachine = new StateMachine(name);
        this.factory = factory;
    }

    public State addState(Command command) {
        var backingState = stateMachine.addState(command);
        return () -> backingState;
    }

    public TrajectoryState addTrajState(String name) {
        return new TrajectoryState(factory.trajectory(name), stateMachine, false);
    }

    public TrajectoryState addTrajState(String name, int splitIndex) {
        return new TrajectoryState(factory.trajectory(name, splitIndex), stateMachine, false);
    }

    public TrajectoryState addTrajState(Trajectory<? extends TrajectorySample<?>> trajectory) {
        return new TrajectoryState(factory.trajectory(trajectory), stateMachine, false);
    }

    /**
     * Sets up a transition from any of the given states to a specific state.
     *
     * @param states The states to transition from.
     * @return A builder for the transition.
     * @see StateMachine#switchFromAny
     */
    public StateMachine.TransitionNeedsTargetStage switchFromAny(State... states) {
        var backingStates = new StateMachine.State[states.length];
        for (int i = 0; i < backingStates.length; i++) {
            backingStates[i] = states[i].backingState();
        }
        return stateMachine.switchFromAny(backingStates);
    }

    /**
     * Sets the initial state for the state machine.
     *
     * @param initialState The new initial state. Cannot be null.
     * @see StateMachine#setInitialState
     */
    public void setInitialState(State initialState) {
        stateMachine.setInitialState(initialState.backingState());
    }

    @Override
    public void run(Coroutine coroutine) {
        stateMachine.run(coroutine);
    }

    @Override
    public String name() {
        return stateMachine.name();
    }

    @Override
    public Set<Mechanism> requirements() {
        return Set.of();
    }
}
