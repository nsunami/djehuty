d3.json(apiUrl)
    .then(function (data) {
        // Parse dates
        const parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%S");
        data.forEach(d => {
            d.created = parseTime(d.created);
        });

        console.log(data);

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

        // Set the dimensions of the canvas
        var margin = { top: 30, right: 20, bottom: 20, left: 20 },
            width = 370 - margin.left - margin.right,
            height = 250 - margin.top - margin.bottom;

        // Adds the svg canvas
        var svg = d3.select("#chart-container").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Set up scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(aggregatedData, d => d.date))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(aggregatedData, d => d.count)])
            .range([height, 0]);

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
            .attr("stop-color", "#009eb0")
            .attr("stop-opacity", 1);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#b51963")
            .attr("stop-opacity", 1);

        // svg.append("path")
        //     .datum(aggregatedData)
        //     .attr("fill", "none")
        //     .attr("stroke", "steelblue")
        //     .attr("stroke-width", 1)
        //     .attr("d", line);

        // Add circles for lollipop ends
        // svg.selectAll(".circle")
        //     .data(aggregatedData)
        //     .enter().append("circle")
        //     .attr("class", "circle")
        //     .attr("cx", d => xScale(d.date))
        //     .attr("cy", d => yScale(d.count))
        //     .attr("r", 1)
        //     .attr("fill", "pink");

        //Draw the area
        svg.append("path")
        .datum(aggregatedData)
        .attr("class", "area")
        .attr("d", area)
        .style("fill", "url(#gradient)");

        //  // Draw the line to the area plot
        //  svg.append("path")
        // .datum(aggregatedData)
        // .attr("class", "line")
        // .attr("fill", "none")
        // .attr("stroke", "#FF204E")
        // .attr("stroke-width", 0.1)
        // .attr("d", line);
        console.log(margin)
        //for daily views
        // Draw the line
        // svg.append("path")
        // .datum(aggregatedData)
        // .attr("class", "line")
        // .attr("fill", "none")
        // .attr("stroke", "#FF204E")
        // .attr("stroke-width", 1)
        // .attr("d", line);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        // Add Y axis
        svg.append("g")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(yScale));

    })
    .catch(function (error) {
        console.error("Error fetching data: " + error);
    });