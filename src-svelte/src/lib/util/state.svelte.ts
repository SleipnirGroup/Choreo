import { tick, untrack } from "svelte";
export type Signal<T> = (() => T) & {
    set: (val: T) => void,
    update: (func: (before: T) => T) => void
}

export function signal<T>(initial: T) {
    let inner = $state<T>(initial);
    let set = (val: T) => { inner = val };
    let ret: Signal<T> = Object.assign(

        () => inner,
        {
            set,
            update: (func: (val: T) => T) => { set(func(inner)) },
        }
    );
    return ret;
}

type HistoryStep<T> = { oldVal: T, newVal: T, idx: number }


type Undoable<T> = Signal<T> & { setNoTrack: (val: T) => void }
export class History {

    undoStack: Array<HistoryStep<any>[]> = [[]];
    redoStack: Array<HistoryStep<any>[]> = [[]];
    undoables: Map<number, Undoable<any>> = new Map();
    idx = 0;
    canUndo = $derived(this.undoStack.length != 0);
    canRedo = $derived(this.redoStack.length != 0);
    _inGroup: boolean = false;
    isInGroup = $derived(this._inGroup);
    activeGroup = [];
    startGroup() {
        this._inGroup = true;
    }
    stopGroup() {
        this._inGroup = false;
        if (this.activeGroup.length != 0) {
            this.undoStack.push(this.activeGroup);
        }

    }
    reportChange<T>(oldVal: T, newVal: T, idx: number) {
        console.log(oldVal, newVal, this.isInGroup);
        let step = { oldVal, newVal, idx };
        this.undoStack[this.undoStack.length - 1].push(step);
        console.log("stack add", this.undoStack);

    }
    undo() {
        console.log("stack", this.undoStack);
        if (this.canUndo) {
            let step = this.undoStack.pop();
            if (step !== undefined) {
                step.toReversed().forEach(st => {
                    this.undoables.get(st.idx)?.setNoTrack(st.oldVal)
                });

            }
        }
    }

    undoable<T>(sig: Signal<T>): Signal<T> {
        const newIDX = ++this.idx;
        let watcher = {
            ignore: false,
            oldVal: $state.snapshot(sig())
        }
        $effect.pre(() => {
            let newVal = $state.snapshot(sig());
            untrack(() => {
                if (!watcher.ignore) {
                    this.reportChange(watcher.oldVal, newVal, newIDX);
                }
                watcher.oldVal = $state.snapshot(newVal);
            }
            )
        })

        let ret: Undoable<T> = Object.assign(
            sig,
            {
                setNoTrack: (v) => {
                    watcher.ignore = true;
                    sig.set(v);
                    tick().then(() => {
                        watcher.ignore = false
                    });
                }
            }
        );
        this.undoables.set(newIDX, ret);
        return ret;
    }
}