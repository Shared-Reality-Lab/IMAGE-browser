import * as helpers from './charts-utils';

document.onreadystatechange = function () {
  setTimeout(function(){
      if (document.readyState === 'complete' && window.Highcharts) {
      var divChartMap = {};
      for (let chart of window.Highcharts.charts){
        divId = chart.renderTo.id;
        containerDivId = chart.container.id;
        document.getElementById(containerDivId).style.height = "max-content";
        document.getElementById(divId).style.height = "max-content";
        divChartMap[divId] = chart
        let chartButton = document.createElement("button");
        chartButton.innerText = "Get IMAGE Chart Rendering";
        chartButton.setAttribute("data-chart-id", divId);
        chartButton.addEventListener("click", function (event){
          targetId = event.target.parentElement.id;
          chartObj = divChartMap[targetId];
          let chartData = helpers.getChartData(chart);
          console.debug(chartData);
          messageObj = {"messageFrom": "imageCharts", "charts": chartData};
          window.postMessage(messageObj, "*");
        });
        document.getElementById(divId).appendChild(chartButton);
      }
  }
},1000);
}