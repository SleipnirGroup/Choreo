<script lang="ts">
    type Props = {
    xOrigin : number;
    yOrigin: number;
    height: number;
    width: number;
    output : Output;
    }
    let {xOrigin, yOrigin, height, width, output} : Props = $props()
    let trajectory = $derived(output.samples);
    import * as d3 from 'd3'
    import {onMount} from 'svelte'
    import {graphColors, type GraphLine, graphViews, emptyGraphData} from "./graph.js"
    import { uistate } from "$lib/uistate.svelte.ts"
    import type { TrajectorySample } from '$lib/trajectory.svelte.js';
    

    const margin = { top: yOrigin, right: xOrigin, bottom: 0, left: 0 };
    let x = $derived.by(()=>{
        return d3.scaleLinear()
        .domain([0,
        (trajectory.length < 2) ? 5 : trajectory[trajectory.length - 1].timestamp
        ])
        .range([0, width])}
        );
    let leftY = $derived(d3.scaleLinear()
        .domain([-5, 5])
        .range([height, 0]));
    let rightY = $derived(d3.scaleLinear()
        .domain([-20, 20])
        .range([height, 0]));
    let leftLine = $derived(d3.line()
        .x((d) => { return x(d[0]); })
        .y((d) => { return leftY(d[1]); }));
    let rightLine = $derived(d3.line()
        .x((d) => { return x(d[0]); })
        .y((d) => { return rightY(d[1]); }));
    $effect(()=>{handleUpdate(trajectory)});
    $effect(()=>redrawAxes(trajectory, width, height));
    function handleUpdate(trajectory: TrajectorySample[]) {
        let newData = emptyGraphData();
        Object.keys(newData).forEach(key => {
            key = key as GraphLine;
            newData[key] = trajectory.map((samp,i,arr) => {
                return [samp.timestamp, graphColors[key].getter(arr,i)]
            });
        })



        // color palette
        uistate.graphData = newData;
    }
    function redrawAxes(trajectory, width, height) {
        
        // set the dimensions and margins of the graph

        // append the svg object to the body of the page
        var svg = d3.select("#rootGroup");
        //Read the data
        //@ts-ignore

        // Add Y axis

        var yAxis = svg.select<SVGGElement>("#yAxis")
        yAxis.selectChildren().remove();
        yAxis.call(d3.axisLeft(leftY).ticks(10));
        yAxis.selectAll("text").attr("fill", "white")
        yAxis.selectAll(":is(line, path)").attr("stroke", "white")

        var rightYAxis = svg.select<SVGGElement>("#rightYAxis")
        rightYAxis.selectChildren().remove();
        rightYAxis.call(d3.axisRight(rightY)
            .tickValues([-20, -16, -12, -8, -4, 0, 4, 8, 12, 16, 20])
        );
        rightYAxis.selectAll("text").attr("fill", "white")
        rightYAxis.selectAll(":is(line, path)").attr("stroke", "white")

        var xGrid = svg.select<SVGGElement>("#xGrid")
        xGrid.selectChildren().remove();
        xGrid.call(d3.axisBottom(x).ticks(10).tickFormat(d => '').tickSize(-height));
        xGrid.selectAll(":is(line, path)").attr("stroke", "#111111")

        var yGrid = svg.select<SVGGElement>("#yGrid")
        yGrid.selectChildren().remove();
        yGrid.call(d3.axisLeft(leftY).ticks(10).tickFormat(d => '').tickSize(-width));
        yGrid.selectAll(":is(line, path)").attr("stroke", "#111111")


    }
    function xGridAction(node, scale) {
        let grid = d3.select<SVGGElement>(node);
        grid.selectChildren().remove();
        grid.call(d3.axisBottom(scale).ticks(10).tickFormat(d => '').tickSize(-height));
        grid.selectAll(":is(line, path)").attr("stroke", "#111111")

        }
    function xAxisAction(node, scale) {
        let grid = d3.select<SVGGElement>(node);
        grid.selectChildren().remove();
        grid.call(d3.axisBottom(scale).ticks(5));
        grid.selectAll("text").attr("fill", "white")
        grid.selectAll(":is(line, path)").attr("stroke", "white")
            return {
                update(scale) {
                    grid.selectChildren().remove();
                    grid.call(d3.axisBottom(scale).ticks(5));
                    grid.selectAll("text").attr("fill", "white")
                    grid.selectAll(":is(line, path)").attr("stroke", "white")
                }
            }
        }
        function yAxisAction(node, scale) {
        let yAxis = d3.select<SVGGElement>(node);
        yAxis.selectChildren().remove();
        yAxis.call(d3.axisLeft(scale).ticks(10));
        yAxis.selectAll("text").attr("fill", "white")
        yAxis.selectAll(":is(line, path)").attr("stroke", "white")

        }
</script>
<rect x={xOrigin} y={yOrigin} height={height} width={width} fill="var(--background-dark-blue)"/>


    

<g transform={"translate(" + margin.right + "," + margin.top + ")"}
    id="rootGroup">
    <g id="xGrid" use:xGridAction={x} transform={"translate(0," + height + ")"}></g>
    <g id="yGrid"></g>
    <g id="xAxis" use:xAxisAction={x} transform={"translate(0," + height + ")"}></g>
    <line x1={0} y1={leftY(0)} x2={width-margin.right-margin.left} y2={leftY(0)}
        stroke="var(--divider-gray)" stroke-width={2}/>
    <g id="yAxis" use:yAxisAction={leftY}></g>
    <g id="rightYAxis" transform={`translate(${width},0)`}></g>
    {#key uistate.graphData}
    {#each Object.entries(graphColors) as [k,val]}
        {#if graphViews[k]()}
        {@const d = val.leftAxis ? leftLine(uistate.graphData[k]) : rightLine(uistate.graphData[k])}
        <path id={`${k}Line`} fill="none" stroke={val.color} strokeWidth={2}
                        d={d ?? undefined}></path>
        {/if}
    {/each}
    {/key}

</g>