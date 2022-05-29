
/** function to get container div id of chart*/
function getChartContainer(chart) {
    return chart.renderTo.id;
}

/** function to get the title of the chart*/
function getTitle(chart) {
    return chart.options.title.text || "";
}

/** function to get the subtitle of the chart*/
function getSubTitle(chart) {
    return chart.options.subtitle && chart.options.subtitle.text;
}

/** function to get the accessibility text of the chart*/
function getAltText(chart) {
    const a11y = chart.accessibility;
    if (a11y) {
        return a11y.components.infoRegions.getLongdescText();
    }
    return ""
}

/** function to get title information from chart axis */
function getAxisTitle(axis) {
    return axis && (
        axis.userOptions && axis.userOptions.accessibility &&
        axis.userOptions.accessibility.description ||
        axis.axisTitle && axis.axisTitle.textStr ||
        axis.options.id ||
        axis.categories && 'categories' ||
        axis.dateTime && 'Time' ||
        ""
    );
}

/** function to get the information from chart axis*/
function getAxisInformation(axis) {
    return {
        axis: axis.coll,
        title: getAxisTitle(axis),
        type: axis.options.type,
        dataMax: axis.dataMax,
        dataMin: axis.dataMin
    };
}

/** function to get data points from series */
function getSeriesData(series) {
    return series.data.map(point => {
        const pointInfo = {};
        if (point.accessibility && point.accessibility.description){
            pointInfo.altText = point.accessibility.description;
        }
        pointKeys = ['x', 'y', 'z', 'open', 'high', 'low', 'close', 'value', 'percentage','name', "text"];
        pointKeys.forEach(key => {
            if (point[key] !== undefined) {
                pointInfo[key] = (key == "text")?sanitizeHTMLString(point[key]):point[key];
            }
        });
        return pointInfo;
    });
}

/** function to sanitize HTML String */
function sanitizeHTMLString(text){
    if(/<\/?[a-z][\s\S]*>/i.test(text)){
        let element = document.createElement("div");
        element.innerHTML = text;
        return element.innerText;
    }
    return text;
}

/** function to get series Information from chart */
function getSeriesInformation(series) {
    return {
        name: series.name,
        numPoints: series.data.length,
        type: series.type,
        data: getSeriesData(series)
    };
}
/**
 * Function to get the information from the given chart
 * @param {*} chart (HighCharts chart object: https://api.highcharts.com/highcharts/chart)
 * @returns the object with all the details
 */
export function getChartData(chart) {
    return {
        containerID: getChartContainer(chart),
        title: sanitizeHTMLString(getTitle(chart)),
        subtitle: getSubTitle(chart),
        altText: getAltText(chart),
        axes: chart.axes.map(getAxisInformation),
        series: chart.series.map(getSeriesInformation)
    };
}