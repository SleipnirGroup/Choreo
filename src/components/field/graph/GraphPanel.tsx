import { Component } from "react";
import * as d3 from "d3";
import { observer } from "mobx-react";
import { autorun, IReactionDisposer } from "mobx";
import { line, tickFormat } from "d3";
import { pathToFileURL } from "url";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { blue, deepOrange, green, red, yellow } from "@mui/material/colors";
import { DifferentialSample, SwerveSample } from "../../../document/2025/v2025_0_0";
import { DimensionName } from "../../../document/ExpressionStore";
import { doc, uiState } from "../../../document/DocumentManager";

type Props = object;
type SwerveGraphLine = Exclude<keyof SwerveSample, "fx"|"fy">
type DifferentialGraphLine = keyof DifferentialSample;
type SharedGraphLine = SwerveGraphLine & DifferentialGraphLine;
type OnlySwerveGraphLine = Exclude<SwerveGraphLine, SharedGraphLine>
type OnlyDiffGraphLine = Exclude<DifferentialGraphLine, SharedGraphLine>
type ExtraGraphLine = "absVel"
| "accel";
type GraphLine = SwerveGraphLine | DifferentialGraphLine | ExtraGraphLine;
type State = Record<GraphLine, boolean>;

type Color = { name: string, color: string, defaultView: boolean, dimension: DimensionNameInSample}
const sharedColors : Record<SharedGraphLine, Color> = {
    t: {
        name: "Timestamp",
        color: "white",
        defaultView: false,
        dimension: "Time"
    },
    x: {
        name: "X Position",
        color: red[500],
        defaultView: false,
        dimension: "Length"
    },
    y: {
        name: "Y Position",
        color: green[600],
        defaultView: false,
        dimension: "Length"
    },
    heading: {
        name: "Heading",
        color: blue[500],
        defaultView: true,
        dimension: "Angle"
    },
} as const;
const swerveColors : Record<OnlySwerveGraphLine, Color> = {
    vx: {
        name: "X Velocity",
        color: red["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    vy: {
        name: "Y Velocity",
        color: green["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    omega: {
        name: "Angular Velocity",
        color: blue["A100"],
        defaultView: true,
        dimension: "AngVel"
    },
    ax: {
        name: "X Accel",
        color: red["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    ay: {
        name: "Y Accel",
        color: green["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    alpha: {
        name: "Angular Accel ",
        color: blue["A100"],
        defaultView: true,
        dimension: "AngVel"
    },
} as const;
const diffColors: Record<OnlyDiffGraphLine, Color> = {


    vl: {
        name: "Left Velocity",
        color: red["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    vr: {
        name: "Right Velocity",
        color: green["A100"],
        defaultView: false,
        dimension: "LinVel"
    },

    al: {
        name: "Left Accel",
        color: red["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    ar: {
        name: "Right Accel",
        color: green["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    fl: {
        name: "Left Force",
        color: deepOrange["500"],
        defaultView: true,
        dimension: "Force"
    },
    fr: {
        name: "Right Force",
        color: deepOrange["500"],
        defaultView: true,
        dimension: "Force"
    }
} as const;
const extraColors: Record<ExtraGraphLine, Color> = {
    absVel: {
        name: "Absolute Velocity (m/s)",
        color: yellow["500"],
        defaultView: true,
        dimension: "LinVel"
    },
    accel: {
        name: "Translational Acceleration (m/s²)",
        color: deepOrange["500"],
        defaultView: true,
        dimension: "LinAcc"
    },

} as const;

const colors : Record<GraphLine, Color> = {
    ...sharedColors,
    ...swerveColors,
    ...diffColors,
    ...extraColors
}
let defaultViews = Object.fromEntries(
    Object.entries(colors).map(entry => [entry[0], entry[1].defaultView])
) as Record<GraphLine, boolean>
type Data = Array<[number, number]>;
type DimensionNameInSample = Exclude<DimensionName, "Mass" | "Torque" | "MoI" | "Number">;
type D3Ranges = Record<DimensionNameInSample, {
    scale: d3.ScaleLinear<number, number, never>,
    line: d3.Line<[number, number]>
}>;
type Ranges = Record<DimensionNameInSample, [number, number]>;
const defaultRanges : Ranges = {
    Length: [0,0],
    LinVel: [0,0],
    LinAcc: [0,0],
    Angle:  [0,0],
    AngVel: [0,0],
    AngAcc: [0,0],
    Time:   [0,0],
    Force:  [0,0]
}
class GraphPanel extends Component<Props, State> {
    state = { ...defaultViews };
    redrawUnlisten: IReactionDisposer | null = null;
    sharedData: Record<SharedGraphLine, Data> = {
        t: [],
        x: [],
        y: [],
        heading: [],
    };
    swerveData: Record<OnlySwerveGraphLine, Data> = {
        vx: [],
        vy: [],
        omega: [],
        ax: [],
        ay: [],
        alpha: []
    };
    diffData: Record<OnlyDiffGraphLine, Data> = {
        vl: [],
        vr: [],
        al: [],
        ar: [],
        fl: [],
        fr: []
    };
    extraData: Record<
        ExtraGraphLine, Data> = {
            absVel: [],
            accel: [],

        };
    ranges = defaultRanges;
    d3Ranges= this.updateD3Ranges();
    updateD3Ranges() {
        let ranges = Object.fromEntries(
            Object.keys(this.ranges).map(key=>{
                let k = key as DimensionNameInSample;
                let range = this.ranges[k] ?? [0,0];
                let scale = d3.scaleLinear().domain(range).range([this.height, 0]);
                let line =  d3.line()
                .x((d) => { return this.x(d[0]); })
                .y((d) => { return scale(d[1]); })
                return [k, {
                        scale,
                        line}
                    ];
            })
        ) as D3Ranges;
        return ranges;
    }
    margin = { top: 10, right: 60, bottom: 30, left: 60 };
    width = 460 - this.margin.left - this.margin.right;
    height = 400 - this.margin.top - this.margin.bottom;
    x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, this.width]);
    componentDidMount() {

        this.redrawUnlisten = autorun(() => {
            this.handleUpdate()
        })
    }
    componentWillUnmount(): void {
        if (this.redrawUnlisten != null) {
            this.redrawUnlisten();
        }

    }
    expandRange(val: number, dim: DimensionNameInSample) {
        if (val > this.ranges[dim][1]) {
            this.ranges[dim][1] = val;
        }
        if (val < this.ranges[dim][0]) {
            this.ranges[dim][0] = val;
        }
    }
    handleUpdate() {
        console.log("update graph");
        var path = doc.pathlist.activePath
        var generated = path.ui.generating ? path.ui.generationProgress : path.traj.fullTraj;
        var _ = path.ui.generationIterationNumber;
        if (generated.length < 2) {
            return;
        }
        this.x.domain([0, generated[generated.length - 1].t])
        // set the dimensions and margins of the graph

        // append the svg object to the body of the page
        var svg = d3.select("#rootGroup");

        //Read the data
        //@ts-ignore


        // Add X axis --> it is a date format
        var xAxis = svg.select<SVGGElement>("#xAxis")
        xAxis.selectChildren().remove();
        xAxis.call(d3.axisBottom(this.x).ticks(5));
        xAxis.selectAll("text").attr("fill", "white")
        xAxis.selectAll(":is(line, path)").attr("stroke", "white")

        // Add Y axis

        // var yAxis = svg.select<SVGGElement>("#yAxis")
        // yAxis.selectChildren().remove();
        // yAxis.call(d3.axisLeft(this.leftY).ticks(10));
        // yAxis.selectAll("text").attr("fill", "white")
        // yAxis.selectAll(":is(line, path)").attr("stroke", "white")

        // var rightYAxis = svg.select<SVGGElement>("#rightYAxis")
        // rightYAxis.selectChildren().remove();
        // rightYAxis.call(d3.axisRight(this.rightY)
        //     .tickValues([-20, -16, -12, -8, -4, 0, 4, 8, 12, 16, 20])
        // );
        // rightYAxis.selectAll("text").attr("fill", "white")
        // rightYAxis.selectAll(":is(line, path)").attr("stroke", "white")

        // var xGrid = svg.select<SVGGElement>("#xGrid")
        // xGrid.selectChildren().remove();
        // xGrid.call(d3.axisBottom(this.x).ticks(10).tickFormat(d => '').tickSize(-this.height));
        // xGrid.selectAll(":is(line, path)").attr("stroke", "#111111")

        // var yGrid = svg.select<SVGGElement>("#yGrid")
        // yGrid.selectChildren().remove();
        // yGrid.call(d3.axisLeft(this.leftY).ticks(10).tickFormat(d => '').tickSize(-this.width));
        // yGrid.selectAll(":is(line, path)").attr("stroke", "#111111")

        // color palette
        if (generated.length > 0) {
            const diff = path.traj.isDifferential;
            
            const swerve = path.traj.isSwerve;
            Object.keys(this.sharedData).forEach(key => {
                let k = key as SharedGraphLine;
                let dim = sharedColors[k].dimension;
                this.sharedData[k] = generated.map(samp => [samp.t, samp[k]]);
            })
 
            if (diff) {
                Object.keys(this.diffData).forEach(key => {
                    let k = key as OnlyDiffGraphLine;

                    let dim = diffColors[k].dimension;
                    this.diffData[k] =  (generated as DifferentialSample[]).map(samp => [samp.t, samp[k]]);
                })
                this.extraData.absVel = (generated as DifferentialSample[]).map(samp => [samp.t, (samp.vl + samp.vr) / 2.0]);
                this.extraData.accel = (generated as DifferentialSample[]).map(samp => [samp.t, (samp.al + samp.ar) / 2.0]);
            }
            if (swerve) {
                Object.keys(this.swerveData).forEach(key => {
                    let k = key as OnlySwerveGraphLine;
                    this.swerveData[k] =  (generated as SwerveSample[]).map(samp => [samp.t, samp[k]]);
                })
                this.extraData.absVel = (generated as SwerveSample[]).map(samp => [samp.t, Math.hypot(samp.vx, samp.vy)]);
                this.extraData.accel = (generated as SwerveSample[]).map(samp => [samp.t, Math.hypot(samp.ax, samp.ay)]);
            }
            // Set ranges
            Object.keys(this.sharedData).forEach(key => {
                let k = key as SharedGraphLine;
                let dim = sharedColors[k].dimension;
                this.sharedData[k].forEach(val=>{
                    this.expandRange(val[1], dim);
                })
            })
            Object.keys(this.swerveData).forEach(key => {
                let k = key as OnlySwerveGraphLine;
                let dim = swerveColors[k].dimension;
                this.swerveData[k].forEach(val=>{
                    this.expandRange(val[1], dim);
                })
            })
            Object.keys(this.diffData).forEach(key => {
                let k = key as OnlyDiffGraphLine;
                let dim = diffColors[k].dimension;
                this.diffData[k].forEach(val=>{
                    this.expandRange(val[1], dim);
                })
            })
            Object.keys(this.extraData).forEach(key => {
                let k = key as ExtraGraphLine;
                let dim = extraColors[k].dimension;
                this.extraData[k].forEach(val=>{
                    this.expandRange(val[1], dim);
                })
            })
            this.d3Ranges = this.updateD3Ranges();
        }
    }

    lines<K extends GraphLine>(colors: Record<K, Color>, data: Record<K, Data>) {
        return Object.entries(colors).map(entry => {
            let [k, v] = entry;
            let key = k as K;
            let val = v as Color;
            let d = this.d3Ranges[val.dimension].line(data[key]);
                return (
                    <path id={`${key}Line`} fill="none" stroke={val.color} strokeWidth={1}
                        d={d ?? undefined} visibility={this.state[key] ? "visible" : "hidden"}></path>
                )

        })
    }
    render() {
        const {
            height, width, margin
        } = this;
        var time = uiState.pathAnimationTimestamp;
        var path = doc.pathlist.activePath
        var generated = path.ui.generating ? path.ui.generationProgress : path.traj.fullTraj;
        var _ = path.ui.generationIterationNumber;
        return (
            <div id="my_dataviz" style={{ backgroundColor: "var(--background-dark-gray)", color:"white", maxHeight: 400, display: "flex", flexDirection: "row"}}>
                    <div style={{display: "grid", gap:"8px", gridTemplateColumns: "min-content max-content auto"}}>
                    <>
                    {Object.entries(colors).map(entry => {
                        var [k, value] = entry;
                        const key = k as GraphLine;
                        return (<>
                            <Checkbox checked={this.state[key]}
                                onChange={
                                    e => {
                                        this.state[key] = e.target.checked;
                                        this.setState({ x: this.state.x })
                                    }
                                }
                                sx={{
                                    color: value.color,
                                    '&.Mui-checked': {
                                        color: value.color,
                                      },
                                }}
                            />
                            <span>{value.name}</span>
                            <span>{0}</span>
                            </>)
                    })}
                    </>
                    </div>
                <svg
                    width={width + margin.left + margin.right}
                    height={height + margin.top + margin.bottom}
                >
                    <g transform={"translate(" + margin.left + "," + margin.top + ")"}
                        id="rootGroup">
                        <g id="xGrid" transform={"translate(0," + this.height + ")"}></g>
                        <g id="yGrid"></g>
                        <g id="xAxis" transform={"translate(0," + this.height + ")"}></g>
                        <g id="yAxis"></g>
                        <g id="rightYAxis" transform={`translate(${this.width},0)`}></g>
                        {this.lines(sharedColors, this.sharedData)}
                        {this.lines(swerveColors, this.swerveData)}
                        {this.lines(diffColors, this.diffData)}
                        {this.lines(extraColors, this.extraData)}

                        <rect x={this.x(time)} width={1} y1={0} height={this.height}
                            fill="gray"></rect>
                    </g>

                </svg>


            </div >)
    }

}
export default observer(GraphPanel)