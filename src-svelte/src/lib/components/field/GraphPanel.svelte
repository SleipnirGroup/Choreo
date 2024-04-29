<script lang="ts">
    export let xOrigin : number;
    export let yOrigin: number;
    export let height: number;
    export let width: number;
    export let trajectory : TrajectorySample[];
    import * as d3 from 'd3'
    import {onMount} from 'svelte'
    import {data, graphViewsDerived, graphColors, type GraphLine } from "$lib/uistate.ts"
    

    const margin = { top: yOrigin, right: xOrigin, bottom: 0, left: 0 };
    let x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, width]);
    let leftY = d3.scaleLinear()
        .domain([-5, 5])
        .range([height, 0]);
    let rightY = d3.scaleLinear()
        .domain([-20, 20])
        .range([height, 0]);
    let leftLine = d3.line()
        .x((d) => { return x(d[0]); })
        .y((d) => { return leftY(d[1]); });
    let rightLine = d3.line()
        .x((d) => { return x(d[0]); })
        .y((d) => { return rightY(d[1]); });
    $: handleUpdate(trajectory);
    $: redrawAxes(trajectory, width, height)
    handleUpdate(trajectory);
    onMount(()=>{
        redrawAxes(trajectory, width, height);
    })
    function handleUpdate(generated: TrajectorySample[]) {
        Object.keys(data).forEach(key => {
            data[key] = generated.map((samp,i,arr) => {
                return [samp.timestamp, graphColors[key].getter(arr,i)]
            });
        })



        // color palette


        console.log(data);
    }
    function redrawAxes(generated, width, height) {
        x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, width]);
        leftY = d3.scaleLinear()
            .domain([-5, 5])
            .range([height, 0]);
        rightY = d3.scaleLinear()
            .domain([-20, 20])
            .range([height, 0]);
        leftLine = d3.line()
            .x((d) => { return x(d[0]); })
            .y((d) => { return leftY(d[1]); });
        rightLine = d3.line()
            .x((d) => { return x(d[0]); })
            .y((d) => { return rightY(d[1]); });
        console.log("update graph");
        if (generated.length < 2) {
            x.domain([0,5]);
        } else {
            x.domain([0, generated[generated.length - 1].timestamp])
        }
        
        // set the dimensions and margins of the graph

        // append the svg object to the body of the page
        var svg = d3.select("#rootGroup");
        console.log(svg);
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

        // var xGrid = svg.select<SVGGElement>("#xGrid")
        // xGrid.selectChildren().remove();
        // xGrid.call(d3.axisBottom(x).ticks(10).tickFormat(d => '').tickSize(-height));
        // xGrid.selectAll(":is(line, path)").attr("stroke", "#111111")

        var yGrid = svg.select<SVGGElement>("#yGrid")
        yGrid.selectChildren().remove();
        yGrid.call(d3.axisLeft(leftY).ticks(10).tickFormat(d => '').tickSize(-width));
        yGrid.selectAll(":is(line, path)").attr("stroke", "#111111")


    }
    function xGridAction(node, scale) {
        let grid = d3.select<SVGGElement>(node);
            console.log("xgrid", grid);
        grid.selectChildren().remove();
        grid.call(d3.axisBottom(scale).ticks(10).tickFormat(d => '').tickSize(-height));
        grid.selectAll(":is(line, path)").attr("stroke", "#111111")

        }
    function xAxisAction(node, scale) {
        let grid = d3.select<SVGGElement>(node);
            console.log("xaxis", grid);
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
            console.log("yaxis", yAxis);
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
                        {#each Object.entries(graphColors) as [k,val]}
                        {#if $graphViewsDerived[k]}
                        {@const d = val.leftAxis ? leftLine(data[k]) : rightLine(data[k])}
                        <path id={`${k}Line`} fill="none" stroke={val.color} strokeWidth={2}
                                        d={d ?? undefined}></path>
                        {/if}
                        {/each}

                    </g>