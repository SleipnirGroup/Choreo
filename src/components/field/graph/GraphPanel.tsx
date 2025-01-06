import { Component } from "react";
import * as d3 from "d3";
import { observer } from "mobx-react";
import { autorun, IReactionDisposer, reaction } from "mobx";
import { line, tickFormat } from "d3";
import { pathToFileURL } from "url";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { blue, deepOrange, green, red, yellow } from "@mui/material/colors";
import { DifferentialSample, SwerveSample } from "../../../document/2025/DocumentTypes";
import { DimensionName, Dimensions } from "../../../document/ExpressionStore";
import { doc, uiState } from "../../../document/DocumentManager";

type Props = object;
type SwerveGraphLine = Exclude<keyof SwerveSample, "fx" | "fy" | "t">
type DifferentialGraphLine = Exclude<keyof DifferentialSample, "t">;
type SharedGraphLine = SwerveGraphLine & DifferentialGraphLine;
type OnlySwerveGraphLine = Exclude<SwerveGraphLine, SharedGraphLine>
type OnlyDiffGraphLine = Exclude<DifferentialGraphLine, SharedGraphLine>
type ExtraGraphLine = "absVel"
    | "accel" | "dt";
type GraphLine = SwerveGraphLine | DifferentialGraphLine | ExtraGraphLine;
type State = {
    views: Record<GraphLine, boolean>,
};

type Color = { name: string, color: string, defaultView: boolean, dimension: DimensionNameInSample }
const sharedColors: Record<SharedGraphLine, Color> = {
    x: {
        name: "X Pos",
        color: red[500],
        defaultView: false,
        dimension: "Length"
    },
    y: {
        name: "Y Pos",
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
    omega: {
        name: "Angular Vel",
        color: blue["A100"],
        defaultView: true,
        dimension: "AngVel"
    },
} as const;
const swerveColors: Record<OnlySwerveGraphLine, Color> = {
    vx: {
        name: "X Vel",
        color: red["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    vy: {
        name: "Y Vel",
        color: green["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    ax: {
        name: "X Accel",
        color: red["A100"],
        defaultView: false,
        dimension: "LinAcc"
    },
    ay: {
        name: "Y Accel",
        color: green["A100"],
        defaultView: false,
        dimension: "LinAcc"
    },
    alpha: {
        name: "Angular Acc",
        color: blue["A100"],
        defaultView: true,
        dimension: "AngAcc"
    },
} as const;
const diffColors: Record<OnlyDiffGraphLine, Color> = {


    vl: {
        name: "Left Vel",
        color: red["A100"],
        defaultView: false,
        dimension: "LinVel"
    },
    vr: {
        name: "Right Vel",
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
        name: "Absolute Vel",
        color: yellow["500"],
        defaultView: true,
        dimension: "LinVel"
    },
    accel: {
        name: "Linear Acc",
        color: deepOrange["500"],
        defaultView: true,
        dimension: "LinAcc"
    },
    dt: {
        name: "dt",
        color: "white",
        defaultView: true,
        dimension: "Time"
    },

} as const;

const colors: Record<GraphLine, Color> = {
    ...sharedColors,
    ...swerveColors,
    ...diffColors,
    ...extraColors
};
const defaultViews = Object.fromEntries(
    Object.entries(colors).map(entry => [entry[0], entry[1].defaultView])
) as Record<GraphLine, boolean>;
type Data = Array<[number, number]>;
type DimensionNameInSample = Exclude<DimensionName, "Mass" | "Torque" | "MoI" | "Number">;
type D3Ranges = Record<DimensionNameInSample, {
    scale: d3.ScaleLinear<number, number, never>,
    line: d3.Line<[number, number]>
}>;
type Ranges = Record<DimensionNameInSample, [number, number]>;
const defaultRanges: Ranges = {
    Length: [0, 0],
    LinVel: [0, 0],
    LinAcc: [0, 0],
    
    Angle: [0, 0],
    AngVel: [0, 0],
    AngAcc: [0, 0],
    Force: [0, 0],
    Time: [0,0]
    
};
const AXIS_WIDTH = 50;
const PLOT_COUNT_X = 3;
const PLOT_COUNT_Y = 2;
class GraphPanel extends Component<Props, State> {
    state = { views: { ...defaultViews } };
    redrawUnlisten: IReactionDisposer | null = null;
    sharedData: Record<SharedGraphLine, Data> = {
        x: [],
        y: [],
        heading: [],
        omega: [],
    };
    swerveData: Record<OnlySwerveGraphLine, Data> = {
        vx: [],
        vy: [],
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
            dt: []
        };
    ranges = defaultRanges;

    d3Ranges = this.updateD3Ranges();
    updateD3Ranges() {
        const ranges = Object.fromEntries(
            Object.keys(this.ranges).map(key => {
                const k = key as DimensionNameInSample;
                const range = this.ranges[k] ?? [0, 0];
                const scale = d3.scaleLinear().domain(range).range([this.plotHeight, 0]);
                const line = d3.line()
                    .x((d) => { return this.x(d[0]); })
                    .y((d) => { return scale(d[1]); });
                return [k, {
                    scale,
                    line
                }
                ];
            })
        ) as D3Ranges;
        return ranges;
    }
    dimView: Record<DimensionNameInSample, () => boolean> = {
        Length: () => false,
        LinVel: () => false,
        LinAcc: () => false,
        Angle: () => false,
        AngVel: () => false,
        AngAcc: () => false,
        Force: () => false,
        Time: ()=> false
    };
    constructor(props: Props) {
        super(props);
        this.handleUpdate(doc.pathlist.activePath.trajectory.samples);

        Object.keys(colors).forEach(key => {
            const k = key as GraphLine;
            const dim = colors[k].dimension;
            const oldView = this.dimView[dim];
            this.dimView[dim] = () => oldView() || this.state.views[k];
        });
    }
    margin = { top: 20, right: 20, bottom: 30, left: 40 };
    width = 460 - this.margin.left - this.margin.right;
    height = 400 - this.margin.top - this.margin.bottom;
    get plotHeight() { return 150; }
    get plotWidth() { return 200; }
    x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, this.plotWidth]);
    componentDidMount() {

        this.redrawUnlisten = reaction(()=>{
            let path = doc.pathlist.activePath;
            if (path.ui.generating) {
                return path.ui.generationProgress;
            }
            return path.trajectory.samples;
        },
        (val) => {
            this.handleUpdate(val);
        });
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
    handleUpdate(generated:SwerveSample[] | DifferentialSample[]) {
        console.log("update graph");
        const path = doc.pathlist.activePath;
        if (generated.length < 2) {
            return;
        }
        this.x.domain([0, generated[generated.length - 1].t]);
        // set the dimensions and margins of the graph

        // append the svg object to the body of the page


        //Read the data
        //@ts-ignore


        // Add X axis --> it is a date format


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
            const diff = path.trajectory.isDifferential;

            const swerve = path.trajectory.isSwerve;
            Object.keys(this.sharedData).forEach(key => {
                const k = key as SharedGraphLine;
                const dim = sharedColors[k].dimension;
                this.sharedData[k] = generated.map(samp => [samp.t, samp[k]]);
            });
            this.extraData.dt = generated.map((samp, i, samples)=>{
                if (i == samples.length-1) return [samp.t, 0];
                let nextSample = samples[i+1];
                return [samp.t, nextSample.t - samp.t];
            })
            if (diff) {
                Object.keys(this.diffData).forEach(key => {
                    const k = key as OnlyDiffGraphLine;

                    const dim = diffColors[k].dimension;
                    this.diffData[k] = (generated as DifferentialSample[]).map(samp => [samp.t, samp[k]]);
                });
                this.extraData.absVel = (generated as DifferentialSample[]).map(samp => [samp.t, (samp.vl + samp.vr) / 2.0]);
                this.extraData.accel = (generated as DifferentialSample[]).map(samp => [samp.t, (samp.al + samp.ar) / 2.0]);
                
            }
            if (swerve) {
                Object.keys(this.swerveData).forEach(key => {
                    const k = key as OnlySwerveGraphLine;
                    this.swerveData[k] = (generated as SwerveSample[]).map(samp => [samp.t, samp[k]]);
                });
                this.extraData.absVel = (generated as SwerveSample[]).map(samp => [samp.t, Math.hypot(samp.vx, samp.vy)]);
                this.extraData.accel = (generated as SwerveSample[]).map(samp => [samp.t, Math.hypot(samp.ax, samp.ay)]);
            }
            // Set ranges
            this.ranges = defaultRanges; // 0s
            Object.keys(this.sharedData).forEach(key => {
                const k = key as SharedGraphLine;
                const dim = sharedColors[k].dimension;
                this.sharedData[k].forEach(val => {
                    this.expandRange(val[1], dim);
                });
            });
            Object.keys(this.swerveData).forEach(key => {
                const k = key as OnlySwerveGraphLine;
                const dim = swerveColors[k].dimension;
                this.swerveData[k].forEach(val => {
                    this.expandRange(val[1], dim);
                });
            });
            Object.keys(this.diffData).forEach(key => {
                const k = key as OnlyDiffGraphLine;
                const dim = diffColors[k].dimension;
                this.diffData[k].forEach(val => {
                    this.expandRange(val[1], dim);
                });
            });
            Object.keys(this.extraData).forEach(key => {
                const k = key as ExtraGraphLine;
                const dim = extraColors[k].dimension;
                this.extraData[k].forEach(val => {
                    this.expandRange(val[1], dim);
                });
            });
            
            this.d3Ranges = this.updateD3Ranges();
            
            Object.entries(this.d3Ranges).forEach((entry, i) => {
                const svg = d3.select(`#${entry[0]}rootGroup`);
                const plot = svg.select<SVGGElement>(`#${entry[0]}Plot`);
                const yAxis = svg.select<SVGGElement>(`#${entry[0]}Axis`)
                    .attr("transform", `translate(${0},0)`);
                yAxis.selectChildren().remove();
                yAxis.call(d3.axisLeft(entry[1].scale).ticks(10));
                yAxis.selectAll("text").attr("fill", "white");
                yAxis.selectAll(":is(line, path)").attr("stroke", "white");

                const xAxis = svg.select<SVGGElement>(`#${entry[0]}xAxis`);
                xAxis.selectChildren().remove();
                xAxis.call(d3.axisBottom(this.x).ticks(5));
                xAxis.selectAll("text").attr("fill", "white");
                xAxis.selectAll(":is(line, path)").attr("stroke", "white");

                xAxis.selectAll(":is(line, path)").attr("stroke", "white");
                console.log(yAxis);
            });
        }
    }
    lines<K extends GraphLine>(colors: Record<K, Color>, data: Record<K, Data>, dimension: DimensionNameInSample) {
        return Object.entries(colors).map(entry => {
            const [k, v] = entry;
            const key = k as K;
            const val = v as Color;
            const d = this.d3Ranges[val.dimension].line(data[key]);
            if (dimension !== val.dimension) {
                return undefined;
            }
            return (
                <path id={`${key}Line`} fill="none" stroke={val.color} strokeWidth={1}
                    d={d ?? undefined} visibility={this.state.views[key] ? "visible" : "hidden"}></path>
            );

        });
    }
    checkboxes<K extends GraphLine>(colors: Record<K, Color>, dimension: DimensionNameInSample) {
        return Object.entries(colors).map(entry => {
            const [k, value] = entry as [K, Color];
            const key = k;
            if (dimension !== value.dimension) {
                return undefined;
            }
            return (<>
                <Checkbox checked={this.state.views[key]}
                    onChange={
                        e => {
                            this.state.views[key] = e.target.checked;
                            this.setState({ views: this.state.views });
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
            </>);
        });
    }
    plot(dimension: DimensionNameInSample) {
        const path = doc.pathlist.activePath;
        const time = uiState.pathAnimationTimestamp;
        return <div style={{display: "flex", flexDirection:"column"}}>
                        <svg
                    width={this.plotWidth+this.margin.left+this.margin.right}
                    height={this.plotHeight+60}
                >

                    <g transform={`translate(${this.margin.left},${this.margin.top})`}
                        id={`${dimension}rootGroup`}>

                    <g id={`${dimension}Plot`} >
                            <g key={dimension} id={`${dimension}Axis`} ></g>
                            <g id={`${dimension}xAxis`} transform={"translate(0," + this.plotHeight + ")"}></g>

                            {this.lines(sharedColors, this.sharedData, dimension)}
                            {path.trajectory.isSwerve && this.lines(swerveColors, this.swerveData, dimension)}
                            {path.trajectory.isDifferential && this.lines(diffColors, this.diffData, dimension)}
                            {this.lines(extraColors, this.extraData, dimension)}
                            <rect x={this.x(time)} width={1} y1={0} height={this.plotHeight}
                                fill="gray"></rect>
                        </g>
                    </g>

                </svg>
        <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "min-content max-content min-content", overflowY: "scroll", height: "min-content"}}>
                    <>
                        {this.checkboxes(sharedColors, dimension)}
                        {path.trajectory.isSwerve && this.checkboxes(swerveColors, dimension)}
                        {path.trajectory.isDifferential && this.checkboxes(diffColors, dimension)}
                        {this.checkboxes(extraColors, dimension)}
                    </>
                </div>
</div>;
        
        

    }
    render() {
        const {
            height, width, margin
        } = this;
        const time = uiState.pathAnimationTimestamp;
        const path = doc.pathlist.activePath;
        const _ = path.ui.generationIterationNumber;
        const marginLeft = Object.keys(this.d3Ranges).length * AXIS_WIDTH;
        return (
            <div id="my_dataviz" style={{ backgroundColor: "var(--background-dark-gray)", color: "white", display: "grid", gridTemplateColumns:"repeat(8, max-content)", overflowX:"scroll" }}>


                        {
                            Object.entries(this.d3Ranges).map(entry => this.plot(entry[0] as DimensionNameInSample))
                        }

            </div >);
    }

}
export default observer(GraphPanel);