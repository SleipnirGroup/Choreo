import { types } from "mobx-state-tree"
import { Instance } from "mobx-state-tree";
import { moveItem } from "mobx-utils";
import { v4 as uuidv4} from 'uuid';
import { SavedDocument, SavedPath, SavedPathList, SavedRobotConfig, SavedTrajectorySample, SavedWaypoint, SAVE_FILE_VERSION } from "./DocumentSpecTypes";

// Save file data types:

// State tree data types:
export const TrajectorySampleStore = types.model("TrajectorySampleStore", {
        "timeInterval": 0,
        "x": 0,
        "y": 0,
        "heading": 0,
        "velocityX": 0,
        "velocityY": 0,
        "angularVelocity": 0
})
.views(self=>{
    return {
        asSavedTrajectorySample() : SavedTrajectorySample {
            let {timeInterval, x, y, heading, velocityX, velocityY, angularVelocity} = self
            return {timeInterval, x, y, heading, velocityX, velocityY, angularVelocity};
        }
    }
})
.actions(self=>{
    return {
        setX(x:number) {self.x=x},
        setY(y:number) {self.y=y},
        setHeading(heading:number) {self.heading=heading},
        setVelocityX(vx:number) {self.velocityX = vx},
        setVelocityY(vy:number) {self.velocityY = vy},
        setAngularVelocity(omega: number) {self.angularVelocity=omega}
    }
})

export const HolonomicWaypointStore= types.model("WaypointStore", {
    x: 0,
    y: 0,
    heading: 0,
    xConstrained: true,
    yConstrained: true,
    headingConstrained: true,
    controlIntervalCount: 0,
    velocityMagnitude:0,
    velocityAngle: 0,
    angularVelocity: 0,
    velocityMagnitudeConstrained: false,
    velocityAngleConstrained:false,
    angularVelocityConstrained: false,
    name: "",
    uuid:types.identifier,
    selected: false,
}).views(self=>{
    return {
        asSavedWaypoint(): SavedWaypoint {
            let {x, y, heading, velocityMagnitude, velocityAngle,
                    xConstrained, yConstrained, headingConstrained, velocityMagnitudeConstrained, velocityAngleConstrained, controlIntervalCount} = self;
            return {x, y, heading, velocityMagnitude, velocityAngle,
                xConstrained, yConstrained, headingConstrained, velocityMagnitudeConstrained, velocityAngleConstrained, controlIntervalCount}
        }
    }
}).actions(self=>{
    return {
        setX(x:number) {self.x=x},
        setXConstrained(xConstrained:boolean) {self.xConstrained=xConstrained},
        setY(y:number) {self.y=y},
        setYConstrained(yConstrained:boolean) {self.yConstrained=yConstrained},
        setHeading(heading:number) {self.heading=heading},
        setHeadingConstrained(headingConstrained:boolean) {self.headingConstrained=headingConstrained},
        setSelected(selected:boolean) {self.selected = selected},

        setVelocityAngle(vAngle:number) {self.velocityAngle=vAngle},
        setVelocityAngleConstrained(velocityAngleConstrained:boolean) {self.velocityAngleConstrained=velocityAngleConstrained},
        setVelocityMagnitude(vMag:number) {self.velocityMagnitude=vMag},
        setVelocityMagnitudeConstrained(velocityMagnitudeConstrained:boolean) {self.velocityMagnitudeConstrained=velocityMagnitudeConstrained},
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
    generated: types.array(TrajectorySampleStore)
}).views(self=>{
    return {
        asSavedPath(): SavedPath {
            return {waypoints: self.waypoints.map(point=>point.asSavedWaypoint()),
                trajectory: self.generated.map(point=>point.asSavedTrajectorySample())}
        },
        lowestSelectedPoint() :IHolonomicWaypointStore | null {
            for(let point of self.waypoints) {
                if (point.selected) return point;
            }
            return null;
        }
    }
}).actions(self=>{
    return {
        setName(name:string) { self.name = name},
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
                let newPoint = TrajectorySampleStore.create();
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
        asSavedPathList():SavedPathList {
            let obj :any = {};
            self.paths.forEach((path)=>{
                obj[path.name] = path.asSavedPath();
            })
            return obj;
        },
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
        addPath(name:string, select:boolean = false) :void {
            let newUUID = uuidv4();
            self.paths.put (HolonomicPathStore.create({uuid: newUUID, name:name, waypoints: []}));
            if (self.paths.size === 1 || select) {
                self.activePathUUID = newUUID
            }
        },
        deletePath(uuid:string){
            self.paths.delete(uuid);
        },
    }
});


export interface IPathListStore extends Instance<typeof PathListStore> {};
export const RobotConfigStore = types.model("WaypointStore", {
    mass:46.7,
    rotationalInertia:5.6,
    wheelMaxVelocity: 16,
    wheelMaxTorque:1.9,
    wheelRadius:0.0508,
    bumperWidth:0.9,
    bumperLength:0.9,
    wheelbase:0.622,
    trackWidth:0.622
    
}).actions(self=>{
    return {
        fromSavedRobotConfig(config: SavedRobotConfig) {
            let {mass, rotationalInertia, wheelMaxTorque, wheelMaxVelocity,
                wheelbase, trackWidth: trackwidth, bumperLength, bumperWidth, wheelRadius} = self;
            return {mass, rotationalInertia, wheelMaxTorque, wheelMaxVelocity,
                wheelbase, trackWidth: trackwidth, bumperLength, bumperWidth, wheelRadius};
        },
        setMass(arg:number) {self.mass=arg},
        setRotationalInertia(arg:number) {self.rotationalInertia=arg},
        setMaxTorque(arg:number) {self.wheelMaxTorque=arg},
        setMaxVelocity(arg:number) {self.wheelMaxVelocity=arg},
        setBumperWidth(arg:number) {self.bumperWidth=arg},
        setBumperLength(arg:number) {self.bumperLength=arg},
        setWheelbase(arg:number) {self.wheelbase=arg},
        setTrackwidth(arg:number) {self.trackWidth=arg},
        setWheelRadius(arg:number) {self.wheelRadius=arg}
    }
}).views(self=>{
    return {
        asSavedRobotConfig() : SavedRobotConfig {
            let {mass, rotationalInertia, wheelMaxTorque, wheelMaxVelocity,
                wheelbase, trackWidth: trackwidth, bumperLength, bumperWidth, wheelRadius} = self;
            return {mass, rotationalInertia, wheelMaxTorque, wheelMaxVelocity,
                wheelbase, trackWidth: trackwidth, bumperLength, bumperWidth, wheelRadius};

        },
        bumperSVGElement() {
            return (`M ${self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${self.bumperWidth / 2}
            `);
        }
    }
})
export interface IRobotConfigStore extends Instance<typeof RobotConfigStore> {};
export default class DocumentModel {
    pathlist = PathListStore.create();
    robotConfig = RobotConfigStore.create();
    asSavedDocument() : SavedDocument {
        return {
            version:SAVE_FILE_VERSION,
            robotConfiguration:this.robotConfig.asSavedRobotConfig(),
            paths:this.pathlist.asSavedPathList(),
        }
    }
    constructor() {
        this.pathlist.addPath("one");
        this.pathlist.addPath("two");
        this.pathlist.addPath("three");
    }


}