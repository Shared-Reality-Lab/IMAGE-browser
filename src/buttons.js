import * as utils from './charts/charts-utils';


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
        chart.reflow = false;
        divId = chart.renderTo.id;
        containerDivId = chart.container.id;
        document.getElementById(containerDivId).style.height = "max-content";
        document.getElementById(divId).style.height = "max-content";
        divChartMap[divId] = chart
        let chartButton = document.createElement("button");
        // Set button text based on language (this is a workaround)
        let chartButtonText;
        if (navigator.language === 'fr')
          chartButtonText = "Interpréter ce graphique avec IMAGE";
        else
          chartButtonText = "Interpret this chart with IMAGE";
        if (extVersion === "test") {
          chartButtonText += " (test)"
        }

        chartButton.innerText = chartButtonText;
        chartButton.style.position = "relative";
        chartButton.style.marginTop = "1rem";
        chartButton.setAttribute("data-chart-id", divId);
        chartButton.addEventListener("click", function (event) {
          targetId = event.target.parentElement.id;
          chartObj = divChartMap[targetId];
          let chartData = utils.getChartData(chart);
          console.debug(chartData);
          messageObj = { "messageFrom": "imageCharts", "charts": chartData };
          window.postMessage(messageObj, "*");
        });
        document.getElementById(divId).style.overflow = "visible";
        document.getElementById(containerDivId).style.overflow = "visible";
        document.getElementById(divId).appendChild(chartButton);
      }
    }
  }
}

function processGraphics() {
  console.debug("inside screenreader script");
  let images = document.getElementsByTagName("img");
  /** add a button below each image - visible to screen reader only */
  for(let image of images){
    let button = document.createElement("button");
    button.innerText = "Interpret graphic with IMAGE";
    /** add styles to button to make it visible to only screen reader */
    button.classList.add("sr-only");
    button.addEventListener("click", function(){
      let imageData = {
        "naturalWidth": image.naturalWidth,
        "naturalHeight": image.naturalHeight,
        "sourceURL": image.currentSrc
      }
      messageObj = { "messageFrom": "screenReaderGraphic", "imageData": imageData };
      window.postMessage(messageObj, "*");
    })
    image.parentNode.insertBefore(button, image.nextSibling);
  }
}


document.onreadystatechange = function () {
  if (document.readyState === 'complete') {
    setTimeout(processCharts, 1000);
    setTimeout(processGraphics, 1000);
  }
}

window.addEventListener('locationchange', function () {
  setTimeout(processCharts, 1000);
})
