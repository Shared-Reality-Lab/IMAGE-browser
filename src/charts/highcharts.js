import * as utils from './charts-utils';


(function () {
  var pushState = history.pushState;
  var replaceState = history.replaceState;

  history.pushState = function () {
    pushState.apply(history, arguments);
    window.dispatchEvent(new Event('pushstate'));
    window.dispatchEvent(new Event('locationchange'));
  };

  history.replaceState = function () {
    replaceState.apply(history, arguments);
    window.dispatchEvent(new Event('replacestate'));
    window.dispatchEvent(new Event('locationchange'));
  };

  window.addEventListener('popstate', function () {
    window.dispatchEvent(new Event('locationchange'))
  });
})();

function processCharts() {
  if(window.Highcharts){
    var divChartMap = {};
    var extVersion = document.getElementById("version-div").getAttribute("ext-version");
    //console.log("From HighCharts", extVersion);
    for (let chart of window.Highcharts.charts) {
      if (chart) {
        divId = chart.renderTo.id;
        containerDivId = chart.container.id;
        document.getElementById(containerDivId).style.height = "max-content";
        document.getElementById(divId).style.height = "max-content";
        divChartMap[divId] = chart
        let chartButton = document.createElement("button");
        let chartButtonText = "Get IMAGE Chart Rendering";
        if (extVersion === "test") {
          chartButtonText += " (test)"
        }
        chartButton.innerText = chartButtonText;
        chartButton.setAttribute("data-chart-id", divId);
        chartButton.addEventListener("click", function (event) {
          targetId = event.target.parentElement.id;
          chartObj = divChartMap[targetId];
          let chartData = utils.getChartData(chart);
          console.debug(chartData);
          messageObj = { "messageFrom": "imageCharts", "charts": chartData };
          window.postMessage(messageObj, "*");
        });
        document.getElementById(divId).appendChild(chartButton);
      }
    }
  }
}

document.onreadystatechange = function () {
  if (document.readyState === 'complete') {
    setTimeout(processCharts, 1000);
  }
}

window.addEventListener('locationchange', function () {
  setTimeout(processCharts, 1000);
})
