import { types } from "mobx-state-tree";
import { Instance } from "mobx-state-tree";
import { moveItem } from "mobx-utils";
import { v4 as uuidv4} from 'uuid';
export const GeneratedPointStore = types.model("GeneratedPointStore", {
        "timeInterval": 0,
        "x": 0,
        "y": 0,
        "heading": 0,
        "velocityX": 0,
        "velocityY": 0,
        "angularVelocity": 0
}).actions(self=>{
    return {setX(x:number) {self.x=x},
        setY(y:number) {self.y=y},
        setHeading(heading:number) {self.heading=heading}}
})
export const WaypointStore = types.model("WaypointStore", {
    x: 0,
    y: 0,
    heading: 0,
    xConstrained: true,
    yConstrained: true,
    headingConstrained: true,
    controlIntervalCount: 0,
    name: "",
    uuid:types.identifier,
    selected: false
}).actions(self=>{
    return {
        setX(x:number) {self.x=x},
        setXConstrained(xConstrained:boolean) {self.xConstrained=xConstrained},
        setY(y:number) {self.y=y},
        setYConstrained(yConstrained:boolean) {self.yConstrained=yConstrained},
        setHeading(heading:number) {self.heading=heading},
        setHeadingConstrained(headingConstrained:boolean) {self.headingConstrained=headingConstrained},
        setSelected(selected:boolean) {self.selected = selected}
    }
})
export interface IWaypointStore extends Instance<typeof WaypointStore> {};
export const HolonomicWaypointStore= WaypointStore
.named("HolonomicWaypointStore")
.props({
    velocityX:0,
    velocityY: 0,
    angularVelocity: 0,
    velocityXConstrained: false,
    velocityYConstrained: false,
    velocityMagnitudeConstrained: false,
    angularVelocityConstrained: false
}).actions(self=>{
    return {
        setVelocityX(vx:number) {self.velocityX=vx},
        setVelocityXConstrained(velocityXConstrained:boolean) {self.velocityXConstrained=velocityXConstrained},
        setVelocityY(vy:number) {self.velocityY=vy},
        setVelocityYConstrained(velocityYConstrained:boolean) {self.velocityYConstrained=velocityYConstrained},
        setAngularVelocity(omega:number) {self.angularVelocity=omega},
        setAngularVelocityConstrained(angularVelocityConstrained:boolean) 
            {self.angularVelocityConstrained=angularVelocityConstrained},

    }
})
export interface IHolonomicWaypointStore extends Instance<typeof HolonomicWaypointStore> {};
export const HolonomicPathStore = types.model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore),
    generated: types.array(GeneratedPointStore)
}).views(self=>{
    return {
        lowestSelectedPoint() :IHolonomicWaypointStore | null {
            for(let point of self.waypoints) {
                if (point.selected) return point;
            }
            return null;
        }
    }
}).actions(self=>{
    return {
        selectOnly(selectedIndex:number) {
            self.waypoints.forEach((point, index) => {
                point.selected = (selectedIndex === index);
            });
        },
        addWaypoint () : IHolonomicWaypointStore {
            
            self.waypoints.push(HolonomicWaypointStore.create({uuid: uuidv4()}));
            return self.waypoints[self.waypoints.length-1];
        },
        deleteWaypoint(index:number) {
            if (self.waypoints[index-1]) {
                self.waypoints[index-1].setSelected(true);
            }
            self.waypoints.remove(self.waypoints[index]);
        },
        deleteWaypointUUID(uuid:string) {
            let index = self.waypoints.findIndex((point)=>point.uuid ===uuid);
            if (self.waypoints[index-1]) {
                self.waypoints[index-1].setSelected(true);
            } else if(self.waypoints[index+1]) {
                self.waypoints[index+1].setSelected(true);
            }
            self.waypoints.remove(self.waypoints[index]);
        },
        reorder(startIndex: number, endIndex: number) {
            //self.waypoints.splice(endIndex, 0, self.waypoints.splice(startIndex, 1)[0]);
            moveItem(self.waypoints, startIndex, endIndex);
        },
        generatePath() {
            self.generated.length = 0;
            self.waypoints.forEach(point=>{
                let newPoint = GeneratedPointStore.create();
                newPoint.setX(point.x);
                newPoint.setY(point.y);
                newPoint.setHeading(point.heading);
                self.generated.push(newPoint);
            })
        }
    }
})
export interface IHolonomicPathStore extends Instance<typeof HolonomicPathStore> {};

export const PathListStore = types.model("PathListStore", {
    paths: types.map(HolonomicPathStore),
    activePathUUID: ""
})
.views(self=>{
    return {
        toJSON() : any {
            let obj :any = {};
            self.paths.forEach((path)=>{
                obj[path.name] = path;
            })
            return obj;
        },
        get pathNames() {
            return Array.from(self.paths.values()).map((pathStore)=>pathStore.name);
        },

        get pathUUIDs() {
            return Array.from(self.paths.keys());
        },
        get activePath() {
            return self.paths.get(self.activePathUUID) || HolonomicPathStore.create({name:"New Path", uuid: uuidv4()});}
    }
})
.actions(self =>{
    return {
        setActivePathUUID(uuid: string) {
            if (self.pathUUIDs.includes(uuid)) {
                self.activePathUUID = uuid;
            }
        },
        addPath(name:string) :void {
            let newUUID = uuidv4();
            self.paths.put (HolonomicPathStore.create({uuid: newUUID, name:name, waypoints: []}));
            if (self.paths.size === 1) {
                self.activePathUUID = newUUID
            }
        }
    }
});
export interface IPathListStore extends Instance<typeof PathListStore> {};
export const RobotConfigStore = types.model("WaypointStore", {
    mass:46.7,
    moi:5.6,
    maxVelocity: 16,
    maxTorque:1.9,
    bumperWidth:0.9,
    bumperLength:0.9,
    wheelbase:0.622,
    trackwidth:0.622
    
}).actions(self=>{
    return {
        
        setMass(arg:number) {self.mass=arg},
        setMoI(arg:number) {self.moi=arg},
        setMaxTorque(arg:number) {self.maxTorque=arg},
        setMaxVelocity(arg:number) {self.maxVelocity=arg},
        setBumperWidth(arg:number) {self.bumperWidth=arg},
        setBumperLength(arg:number) {self.bumperLength=arg},
        setWheelbase(arg:number) {self.wheelbase=arg},
        setTrackwidth(arg:number) {self.trackwidth=arg},
    }
})
export interface IRobotConfigStore extends Instance<typeof RobotConfigStore> {};
export default class DocumentModel {
    pathlist = PathListStore.create();
    robotConfig = RobotConfigStore.create();
    constructor() {
        this.pathlist.addPath("one");
        this.pathlist.addPath("two");
        this.pathlist.addPath("three");
    }

    saveFile() {
        const content = JSON.stringify(this.pathlist, undefined, 4);
        // TODO make document save file here
        const element = document.createElement("a");
        const file = new Blob([content], {type: "application/json"});
        let link = URL.createObjectURL(file);
        console.log(link);
        window.open(link, '_blank');
        //Uncomment to "save as..." the file
        // element.href = link;
        // element.download = "file.json";
        // element.click();
    }
}