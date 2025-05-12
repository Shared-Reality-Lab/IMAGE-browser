import * as utils from './charts/charts-utils';
import { displayButtons } from "./config";


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
  if (window.Highcharts) {
    var divChartMap = {};
    var extVersion = document.getElementById("version-div").getAttribute("ext-version");
    //console.log("From HighCharts", extVersion);
    for (let chart of window.Highcharts.charts) {
      if (chart) {
        chart.reflow = false;
        let divId = chart.renderTo.id;
        let containerDivId = chart.container.id;
        document.getElementById(containerDivId).style.height = "max-content";
        document.getElementById(divId).style.height = "max-content";
        divChartMap[divId] = chart
        let chartButton = document.createElement("button");
        chartButton.type = "button";
        // Set button text based on language (this is a workaround)
        let chartButtonText;
        if (navigator.language === 'fr')
          chartButtonText = "Interpréter ce graphique avec IMAGE";
        else
          chartButtonText = "Interpret this chart with IMAGE";
        if (extVersion === "development") {
          chartButtonText += " (test)"
        }

        chartButton.innerText = chartButtonText;
        chartButton.style.position = "relative";
        chartButton.style.marginTop = "1rem";
        chartButton.setAttribute("data-chart-id", divId);
        chartButton.addEventListener("click", function (event) {
          let targetId = event.target.parentElement.id;
          let chartObj = divChartMap[targetId];
          let chartData = utils.getChartData(chart);
          console.debug(chartData);
          let messageObj = { "messageFrom": "imageCharts", "charts": chartData };
          window.postMessage(messageObj, "*");
        });
        document.getElementById(divId).style.overflow = "visible";
        document.getElementById(containerDivId).style.overflow = "visible";
        document.getElementById(divId).appendChild(chartButton);
      }
    }
  }
}

function createDropdownForImage(img) {
  const dropdown = document.createElement('select');
  dropdown.className = 'monarch-dropdown-sr-only display-none';
  
  const options = [
    { text: 'Select IMAGE options', value: '' },
    { text: 'Interpret this graphic with IMAGE', value: 'interpret' },
    { text: 'Load in Tactile Authoring tool', value: 'tactile' },
    { text: 'Send Graphic to Monarch', value: 'monarch' }
  ];

  options.forEach((opt, index) => {
    const option = document.createElement('option');
    option.text = opt.text;
    option.value = opt.value;
    if (index === 0) {
      option.selected = true;
      option.disabled = true;
    }
    dropdown.appendChild(option);
  });

  dropdown.addEventListener('change', function() {
    const selectedValue = this.value;
    if (selectedValue) {
      let imageData = {
        "naturalWidth": img.naturalWidth,
        "naturalHeight": img.naturalHeight,
        "sourceURL": img.currentSrc
      };
      let messageObj = { "messageFrom": "screenReaderGraphic", "imageData": imageData };

      switch(selectedValue) {
        case 'tactile':
          messageObj.redirectToTAT = true;
          messageObj.sendToMonarch = false;
          break;
        case 'monarch':
          messageObj.redirectToTAT = true;
          messageObj.sendToMonarch = true;
          break;
      }

      window.postMessage(messageObj, "*");
      this.selectedIndex = 0;
    }
  });

  return dropdown;
}

function processGraphics() {
  console.debug("inside screenreader script");
  let userAgent = navigator.userAgent;
  let buttons = displayButtons;
  /* Make buttons visible if the user agent is iPhone*/
  if (userAgent.includes("iPhone")) {
    buttons = true;
  }
  let images = document.getElementsByTagName("img");
  /** add a button below each image - visible to screen reader only */
  for (let image of images) {

    // ignore detected images with no src attribute, e.g., on Overleaf
    // ignore images in radio button and select dropdown
    if (!image.hasAttribute("src")
        || (image.parentElement && (image.parentElement.nodeName.toLowerCase() == "li" || image.parentElement.nodeName.toLowerCase() == "label"))) {
      continue;
    }

    let button = document.createElement("button");
    button.type = "button";
    button.innerText = "Interpret graphic with IMAGE";
    button.classList.add("sr-button");
    /* Make the button hidden depending on the config */
    if (!buttons) {
      button.classList.add("sr-only");
    }
    /** add styles to button to make it visible to only screen reader */
    button.addEventListener("click", function () {
      let imageData = {
        "naturalWidth": image.naturalWidth,
        "naturalHeight": image.naturalHeight,
        "sourceURL": image.currentSrc
      }
      let messageObj = { "messageFrom": "screenReaderGraphic", "imageData": imageData };
      window.postMessage(messageObj, "*");
    })
    // add inline css for sr-only class to handle print display
    // this is because some sites do not apply external stylesheet when using window.print and buttons were visible in PDF 
    // button.style.position = "absolute";
    // button.style.width= "1px";
    // button.style.height = "1px";
    // button.style.padding = "0px";
    // button.style.margin = "-1px";
    // button.style.overflow = "hidden";
    // button.style.clip = "rect(0, 0, 0, 0)";
    // button.style.border = "0";

    image.parentNode.insertBefore(button, image.nextSibling);

    // Create and add dropdown
    let dropdown = createDropdownForImage(image);
    image.parentNode.insertBefore(dropdown, button.nextSibling);
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
