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
type Item<T> = { sig: Undoable<T>, snapshot: T };
export class UndoManager {

    undoStack: Array<HistoryStep<any>[]> = $state([]);
    redoStack: Array<HistoryStep<any>[]> = $state([]);
    undoables: Map<number, Item<any>> = new Map();
    snapshot: Map<number, any> = new Map();
    idx = 0;
    canUndo = $derived(this.undoStack.length != 0);
    canRedo = $derived(this.redoStack.length != 0);
    _inGroup: boolean = false;
    startGroup() {
        console.log("start group");
        this._inGroup = true;
        this.undoables.forEach((item) => {
            item.snapshot = item.sig();
        });
    }
    stopGroup() {
        console.log("stop group");
        this._inGroup = false;
        let batch: HistoryStep<any>[] = [];
        this.undoables.forEach((item, id) => {
            if (item.snapshot != item.sig()) {
                batch.push({ oldVal: item.snapshot, newVal: item.sig(), idx: id })
            }
        });
        if (batch.length != 0) {
            this.undoStack.push(batch);
        }

    }
    reportChange<T>(oldVal: T, newVal: T, idx: number) {
        let step = { oldVal, newVal, idx };
        // grouping is handled by before-after comparison
        if (!this._inGroup) { 
            this.undoStack.push([step]);
        }
    }
    undo() {
        if (this.canUndo) {
            let step = this.undoStack.pop();
            if (step !== undefined) {
                step.toReversed().forEach(st => {
                    this.undoables.get(st.idx)?.sig.setNoTrack(st.oldVal)
                });
                this.redoStack.push(step);
            }
        }
        console.log("undo stack", this.undoStack, this.redoStack);
    }

    redo() {
        
        if (this.canRedo) {
            let step = this.redoStack.pop();
            if (step !== undefined) {
                step.forEach(st => {
                    this.undoables.get(st.idx)?.sig.setNoTrack(st.newVal)
                });
                this.undoStack.push(step);
            }
        }
        console.log("redo stack", this.undoStack, this.redoStack);
    }

    undoable<T>(sig: Signal<T>): Signal<T> {
        const newIDX = ++this.idx;
        let watcher = {
            ignore: false,
            oldVal: $state.snapshot(sig())
        }
        // A function that unlistens to changes 
        const unwatch = $effect.root(() => {
            let firstRun = true;
            $effect(() => {
                let newVal = $state.snapshot(sig());
                untrack(() => {
                    if (!watcher.ignore && !firstRun) {
                        this.reportChange(watcher.oldVal, newVal, newIDX);
                    }
                    watcher.oldVal = newVal;
                    firstRun = false;
                }
                )
            })
            return () => console.log("unwatch", sig);
        }
        );

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
        this.undoables.set(newIDX, { sig: ret, snapshot: ret() });
        return ret;
    }
}