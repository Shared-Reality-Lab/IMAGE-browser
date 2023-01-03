import * as utils from './charts-utils';

document.onreadystatechange = function () {
  setTimeout(function(){
      if (document.readyState === 'complete' && window.Highcharts) {
      var divChartMap = {};
      var extVersion = document.getElementById("version-div").getAttribute("ext-version");
      //console.log("From HighCharts", extVersion);
      for (let chart of window.Highcharts.charts){
        divId = chart.renderTo.id;
        containerDivId = chart.container.id;
        document.getElementById(containerDivId).style.height = "max-content";
        document.getElementById(divId).style.height = "max-content";
        divChartMap[divId] = chart
        let chartButton = document.createElement("button");
        let chartButtonText = "Get IMAGE Chart Rendering";
        if(extVersion==="test"){
          chartButtonText += " (test)"
        }
        chartButton.innerText = chartButtonText;
        chartButton.setAttribute("data-chart-id", divId);
        chartButton.addEventListener("click", function (event){
          targetId = event.target.parentElement.id;
          chartObj = divChartMap[targetId];
          let chartData = utils.getChartData(chart);
          console.debug(chartData);
          messageObj = {"messageFrom": "imageCharts", "charts": chartData};
          window.postMessage(messageObj, "*");
        });
        document.getElementById(divId).appendChild(chartButton);
      }
  }
},1000);
}