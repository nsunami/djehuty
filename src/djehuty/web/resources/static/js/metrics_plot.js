function generatePlot(data, yAxisLabel) {

    d3.select("#chart-container").selectAll("svg").remove();

    // Parse dates
    const parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%S");
    data.forEach(d => {
        d.created = parseTime(d.created);
    });

    // Rollup data per day
    const rollupData = d3.rollup(data,
        v => v.length,  // Aggregation function (count)
        d => d3.timeDay(d.created) // Grouping function (per day)
    );

    // Get the range of dates from your data
    const startDate = d3.min(data, d => d.created);
    const endDate = d3.max(data, d => d.created);
    const dateRange = d3.timeDay.range(startDate, endDate, 1); // 1-day interval

    // Convert rollupData map to array
    let aggregatedData = Array.from(rollupData, ([key, value]) => ({ date: key, count: value }));


    // Iterate through dateRange and check if each date exists in aggregatedData
    dateRange.forEach(date => {
        const existingData = aggregatedData.find(d => d.date.getTime() === date.getTime());
        if (!existingData) {
            aggregatedData.push({ date, count: 0 }); // Append zero count for missing date
        }
    });

    // Sort the aggregatedData array by date
    aggregatedData.sort((a, b) => a.date - b.date);

    // Accumulate counts
    let accumulatedData = [];
    let accumulatedCount = 0;
    aggregatedData.forEach(d => {
        accumulatedCount += d.count;
        accumulatedData.push({ date: d.date, count: accumulatedCount });
    });


    // Calculate sum of counts
    const totalCount = aggregatedData.reduce((total, data) => total + data.count, 0);

    // Calculate average count
    const averageCount = totalCount / aggregatedData.length;


    // Set the dimensions of the canvas
    var margin = { top: 30, right: 50, bottom: 40, left: 20 },
        width = 370 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    // Adds the svg canvas
    var svg = d3.select("#chart-container").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .call(responsivefy)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    
    const container = d3.select(svg.node().parentNode);

    // Set up scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(aggregatedData, d => d.date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
    .domain([0, d3.max(aggregatedData, d => d.count)])
    .range([height, 0]);
    // .domain([0, averageCount])
    // .range([height, 0]);

    
// Create the average count line
    svg.append("line")
        .attr("x1", 0) 
        .attr("x2", width) 
        .attr("y1", yScale(averageCount)) 
        .attr("y2", yScale(averageCount)) 
        .attr("stroke", "black") 
        .attr("stroke-width", 2) 
        .call(animatePath); 


    // Define the line generator
    var line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.count))
        .curve(d3.curveMonotoneX);

    // Define the area generator
    const area = d3.area()
        .x(d => xScale(d.date))
        .y0(height)
        .y1(d => yScale(d.count));


    // Add tooltip
    var tooltip = d3.select("#chart-container").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1);
            
    // Add a circle element
    const circle = svg.append("circle")
        .attr("r", 0)
        .attr("fill", "steelblue")
        .style("stroke", "white")
        .attr("opacity", .70)
        .style("pointer-events", "none");

    // create a listening rectangle
    const listeningRect = svg.append("rect")
        .attr("width", width)
        .attr("height", height);

    // Create our gradient  
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#b51963")
        .attr("stop-opacity", 1);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#04AA6D" )
        .attr("stop-opacity", 1);

      // Add vertical gridlines
    svg.selectAll("xGrid")
        .data(xScale.ticks().slice(1))
        .join("line")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width2", .5);

    // Add horizontal gridlines
    svg.selectAll("yGrid")
        .data(yScale.ticks().slice(1))
        .join("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width2", .5)

    // Draw the line
    svg.append("path")
        .datum(aggregatedData)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "url(#gradient)")
        .attr("stroke-width", 1)
        .attr("d", line)
        .call(animatePath); // Animate 'path'
    
      // create the mouse move function
      listeningRect.on("mousemove", function (event) {
        const [xCoord] = d3.pointer(event, this);
        const bisectDate = d3.bisector(d => d.date).left;
        const x0 = xScale.invert(xCoord);
        const i = bisectDate(aggregatedData, x0, 1);
        const d0 = aggregatedData[i - 1];
        const d1 = aggregatedData[i];
        const d2 = accumulatedData[i];
        const d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        const xPos = xScale(d.date);
        const yPos = yScale(d.count);
        
        
        // Update the circle position
        circle.attr("cx", xPos)
        .attr("cy", yPos);

        // Add transition for the circle radius
        circle.transition()
        .duration(50)
        .attr("r", 5); // originally 5 

        // add in  our tooltip
        tooltip
        .style("display", "block")
        .style("left", `${xPos + container.node().getBoundingClientRect().width * 1.25}px`) 
        .style("top", `${yPos + container.node().getBoundingClientRect().height * 0.6}px`) 
        .call(responsivefy, container)
        .html(`<strong>Date:</strong> ${d.date.toLocaleDateString('en-GB')}<br><strong>Total:</strong> ${d2.count !== undefined ? (d2.count).toFixed(0) : 'N/A'} <br> <strong>Daily:</strong> ${d1.count !== undefined ? (d1.count).toFixed(0) : 'N/A' } `)
    });
    
    // listening rectangle mouse leave function
    listeningRect.on("mouseleave", function () {
        circle.transition()
        .duration(50)
        .attr("r", 0);

    tooltip.style("display", "none");
});

    // Text label for the average count
    svg.append("text")
        .attr("x", width - 10) 
        .attr("y", yScale(averageCount) - 5) 
        .attr("text-anchor", "end") 
        .attr("fill", "black") 
        .text(`Average: ${averageCount.toFixed(2)}`); 

    // Add Y axis
    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${width},0)`)
        .call(d3.axisRight(yScale).ticks(6));

    // Style for tick labels on y-axis
    svg.selectAll(".y-axis text")
        .style("fill", "#777"); 

    // Add X axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6));
    
    // Style for tick labels on x-axis
    svg.selectAll(".x-axis text")
      .style("fill", "#777"); 

    // Add the chart title
    svg.append("text")
      .attr("class", "chart-title")
      .attr("x", width/2 -10)
      .attr("y", height   + 30)
      .style("fill", "#777")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(yAxisLabel);
}

function responsivefy(svg) {
    // Get container's width and height
    const container = d3.select(svg.node().parentNode);
    const width = parseInt(svg.style("width"));
    const height = parseInt(svg.style("height"));

    // Calculate aspect ratio
    const aspect = width / height;

    // Add viewBox and preserveAspectRatio properties, and resize svg
    svg.attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMinYMid")
        .call(resize);

    // Add resize event listener
    d3.select(window).on("resize." + container.attr("id"), resize);

    // Function to handle resizing
    function resize() {
        const targetWidth = parseInt(container.style("width"));
        svg.attr("width", targetWidth);
        svg.attr("height", Math.round(targetWidth / aspect));
    }
}


// Function to animate path
function animatePath(path) {
    path.transition()
        .duration(2000) // Total duration for animation
        .attrTween("stroke-dasharray", function() {
            const length = this.getTotalLength();
            return function(t) {
                return (d3.interpolateString("0," + length, length + ",0"))(t);
            };
        });
}

