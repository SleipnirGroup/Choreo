import HolonomicPath from "../datatypes/HolonomicPath";
import HolonomicWaypoint from "../datatypes/HolonomicWaypoint";

export default class DocumentModel {
    paths: Map<string, HolonomicPath>;
    activePath: string = "";
    constructor () {
        this.paths = new Map<string, HolonomicPath>();
        this.paths.set("one", new HolonomicPath([]));
        this.paths.set("two", new HolonomicPath([new HolonomicWaypoint("point")]));
    }
    getPath(key:string) : HolonomicPath {
        return this.paths.get(key) || new HolonomicPath([]);
    }
    getPaths() :Array<string> {
        return Array.from(this.paths.keys());
    }
    addPath(name: string) {
        if (! this.getPaths().includes(name)) {
            this.paths.set(name, new HolonomicPath([]));
        }
    }
    setActivePath(name: string) {
        console.log(this.getPaths());
        if (this.getPaths().includes(name)) {
            this.activePath = name;
        }
        else {
            console.log("path not found");
        }
        console.log(name);
    }
    getActivePath(): HolonomicPath {
        if (this.paths.get(this.activePath) === undefined) {
            console.log("returning empty path for ", this.activePath);
        }
        return this.paths.get(this.activePath) || new HolonomicPath([]);
    }
}