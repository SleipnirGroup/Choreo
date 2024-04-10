import { Component } from "react";
import * as d3 from "d3";
import DocumentManagerContext from "../../../document/DocumentManager";
import { SavedTrajectorySample } from "../../../document/DocumentSpecTypes";
import { observer } from "mobx-react";
import { autorun, IReactionDisposer } from "mobx";
import { line, tickFormat } from "d3";
import { pathToFileURL } from "url";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { blue, deepOrange, green, red, yellow } from "@mui/material/colors";

type Props = object;
type GraphLine = keyof SavedTrajectorySample
    | "absVel"
    | "accel";
type State = Record<GraphLine, boolean>;


let colors: Record<GraphLine, { name: string, color: string, leftAxis: boolean, defaultView: boolean }> = {
    timestamp: {
        name: "Timestamp (s)",
        color: "white",
        leftAxis: true,
        defaultView: false
    },
    x: {
        name: "X Position (m)",
        color: red[500],
        leftAxis: false,
        defaultView: false
    },
    y: {
        name: "Y Position (m)",
        color: green[600],
        leftAxis: false,
        defaultView: false
    },
    heading: {
        name: "Heading (rad)",
        color: blue[500],
        leftAxis: true,
        defaultView: true
    },
    velocityX: {
        name: "X Velocity (m/s)",
        color: red["A100"],
        leftAxis: true,
        defaultView: false
    },
    velocityY: {
        name: "Y Velocity (m/s)",
        color: green["A100"],
        leftAxis: true,
        defaultView: false
    },
    angularVelocity: {
        name: "Angular Velocity (rad/s)",
        color: blue["A100"],
        leftAxis: true,
        defaultView: true
    },
    absVel: {
        name: "Absolute Velocity (m/s)",
        color: yellow["500"],
        leftAxis: true,
        defaultView: true
    },
    accel: {
        name: "Translational Acceleration (m/s²)",
        color: deepOrange["500"],
        leftAxis: false,
        defaultView: true
    }
}
let defaultViews = Object.fromEntries(
    Object.entries(colors).map(entry => [entry[0], entry[1].defaultView])
) as Record<GraphLine, boolean>
class GraphPanel extends Component<Props, State> {
    static contextType = DocumentManagerContext;
    declare context: React.ContextType<typeof DocumentManagerContext>;
    state = { ...defaultViews };
    redrawUnlisten: IReactionDisposer | null = null;
    data: Record<
        GraphLine, Array<[number, number]>> = {
            x: [],
            y: [],
            heading: [],
            velocityX: [],
            velocityY: [],
            angularVelocity: [],
            timestamp: [],
            absVel: [],
            accel: []
        };
    margin = { top: 10, right: 60, bottom: 30, left: 60 };
    width = 460 - this.margin.left - this.margin.right;
    height = 400 - this.margin.top - this.margin.bottom;
    x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, this.width]);
    leftY = d3.scaleLinear()
        .domain([-5, 5])
        .range([this.height, 0]);
    rightY = d3.scaleLinear()
        .domain([-20, 20])
        .range([this.height, 0]);
    leftLine = d3.line()
        .x((d) => { return this.x(d[0]); })
        .y((d) => { return this.leftY(d[1]); });
    rightLine = d3.line()
        .x((d) => { return this.x(d[0]); })
        .y((d) => { return this.rightY(d[1]); });
    componentDidMount() {

        this.redrawUnlisten = autorun(() => {
            var path = this.context.model.document.pathlist.activePath
            var generated = path.generating ? path.generationProgress : path.generated;
            var _ = path.generationIterationNumber;
            this.handleUpdate()
        })
    }
    componentWillUnmount(): void {
        if (this.redrawUnlisten != null) {
            this.redrawUnlisten();
        }

    }
    handleUpdate() {
        console.log("update graph");
        var path = this.context.model.document.pathlist.activePath
        var generated = path.generating ? path.generationProgress : path.generated;
        if (generated.length < 2) {
            return;
        }
        this.x.domain([0, generated[generated.length - 1].timestamp])
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

        var yAxis = svg.select<SVGGElement>("#yAxis")
        yAxis.selectChildren().remove();
        yAxis.call(d3.axisLeft(this.leftY).ticks(10));
        yAxis.selectAll("text").attr("fill", "white")
        yAxis.selectAll(":is(line, path)").attr("stroke", "white")

        var rightYAxis = svg.select<SVGGElement>("#rightYAxis")
        rightYAxis.selectChildren().remove();
        rightYAxis.call(d3.axisRight(this.rightY)
            .tickValues([-20, -16, -12, -8, -4, 0, 4, 8, 12, 16, 20])
        );
        rightYAxis.selectAll("text").attr("fill", "white")
        rightYAxis.selectAll(":is(line, path)").attr("stroke", "white")

        var xGrid = svg.select<SVGGElement>("#xGrid")
        xGrid.selectChildren().remove();
        xGrid.call(d3.axisBottom(this.x).ticks(10).tickFormat(d => '').tickSize(-this.height));
        xGrid.selectAll(":is(line, path)").attr("stroke", "#111111")

        var yGrid = svg.select<SVGGElement>("#yGrid")
        yGrid.selectChildren().remove();
        yGrid.call(d3.axisLeft(this.leftY).ticks(10).tickFormat(d => '').tickSize(-this.width));
        yGrid.selectAll(":is(line, path)").attr("stroke", "#111111")

        // color palette

        Object.keys(this.data).forEach(key => {
            let k = key as keyof SavedTrajectorySample;
            this.data[k] = generated.map(samp => {
                return [samp.timestamp, samp[k]]
            });
        })
        this.data.absVel = generated.map(samp => {
            return [samp.timestamp, Math.hypot(samp.velocityX, samp.velocityY)]
        })
        this.data.accel = generated.map((s, i, arr) => {
            var samp: SavedTrajectorySample = arr[i - 1];
            var samp2: SavedTrajectorySample = arr[i + 1];
            if (samp2 === undefined || samp === undefined) {
                return [s.timestamp, 0];
            }

            return [s.timestamp, (this.data.absVel[i + 1][1] - this.data.absVel[i - 1][1]) / (samp2.timestamp - samp.timestamp)];
        })
    }

    render() {
        const {
            height, width, margin
        } = this;
        var time = this.context.model.uiState.pathAnimationTimestamp;
        var path = this.context.model.document.pathlist.activePath
        var generated = path.generating ? path.generationProgress : path.generated;
        var _ = path.generationIterationNumber;
        return (
            <div id="my_dataviz" style={{ backgroundColor: "var(--background-dark-gray)", color:"white"}}>
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
                        {Object.entries(colors).map(entry => {
                            let [k, val] = entry;
                            let key = k as GraphLine;
                            let data = val.leftAxis ? this.leftLine(this.data[key]) : this.rightLine(this.data[key]);
                            if (this.state[key]) {
                                return (
                                    <path id={`${key}Line`} fill="none" stroke={val.color} strokeWidth={1}
                                        d={data ?? undefined}></path>
                                )
                            }

                        })}

                        <rect x={this.x(time)} width={1} y1={0} height={this.height}
                            fill="gray"></rect>
                    </g>

                </svg>
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

            </div >)
    }

}
export default observer(GraphPanel)