<script>
	import { StateHistory, watch } from "runed";

	class Undoable {
		#idx;
		#getStates;
		#states = $derived.by(() => this.#getStates());
		#current = $derived.by(() => this.#states[this.#idx])
		#currentLocal = $state()

		constructor(getStates, setStates, initial) {
			const states = $derived.by(getStates);
			getStates().push(initial);

			this.#getStates = getStates;
			this.#currentLocal = initial;
			this.#idx = getStates().length - 1;

			watch(
				() => this.#currentLocal,
				() => {
					if (this.current === this.#currentLocal) return;
					// Reassign to trigger state history value tracking
					setStates(
						states
							.slice(0, this.#idx)
							.concat([this.#currentLocal])
							.concat(states.slice(this.#idx + 1))
					);
				},
				{ lazy: true }
			);

			watch(
				() => this.current,
				() => {
					if (this.current === this.#currentLocal) return;
					this.#currentLocal = this.current;
				}
			);
		}

		get current() {
			return this.#current;
		}

		set current(val) {
			this.#currentLocal = val;
		}
	}

    type HistoryStep<T> = (before: T, after: T, setter: (arg: T)=>{});
	class GlobalHistory extends StateHistory<HistoryStep<any>>{
		states = $state([]);

		constructor() {
			super(
				() => this.states,
				(v) => (this.states = v)
			);
		}

		undoable<T>(initial: T) {
			return new Undoable(
				() => this.states,
				(v: T) => (this.states = v),
				initial
			);
		}
	}

	// App logic starts here
	const history = new GlobalHistory();
	let count1 = history.undoable(0);
	let count2 = history.undoable(0);

