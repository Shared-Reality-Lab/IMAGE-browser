document.onreadystatechange = function () {
  setTimeout(function(){
      if (document.readyState === 'complete' && window.Highcharts) {
      var divChartMap = {};
      for (chart of window.Highcharts.charts){
        divId = chart.renderTo.id;
        containerDivId = chart.container.id;
        document.getElementById(containerDivId).style.height = "max-content";
        document.getElementById(divId).style.height = "max-content";
        divChartMap[divId] = chart
        let chartButton = document.createElement("button");
        chartButton.innerText = "Get IMAGE Chart Rendering";
        chartButton.addEventListener("click", (event) => {
          targetId = event.target.parentElement.id;
          chartObj = divChartMap[targetId];
          let xLabels = [];
          let xDesc = chartObj?.xAxis[0]?.title?.text || chartObj?.xAxis[0]?.axisTitle?.textStr || "";
          let yDesc = chartObj?.yAxis[0]?.title?.text || chartObj?.yAxis[0]?.axisTitle?.textStr || "";
          if (chartObj.xAxis[0].names && chartObj.xAxis[0].names.length > 0){
            xLabels = chartObj.xAxis[0].names;
          }
          else if (chartObj.xAxis[0].categories && chartObj.xAxis[0].categories.length > 0){
            xLabels = chartObj.xAxis[0].categories;
          }

          seriesData = [];
          maxCount = 0;
          for (series of chartObj.series){
            seriesObj = {name:"", data:[], type: ""}
            data = series.data;
            if(data.length > maxCount){
              maxCount = data.length
            }
            optionsData = [];
            highChartKeys = ["x", "y","value", "category", "name", "dt"]
            for (point of data){
                let pointData = {}
                for (key of highChartKeys){
                  if (point[key]){
                    pointData[key] = point[key]

                  }
                }
                optionsData.push(pointData);
              }
            seriesObj.data.push(optionsData)
            seriesObj.name = series.name;
            seriesObj.type = series.type;
            seriesData.push(seriesObj);
          }
          
          chartData = {
            title: chartObj.title?.textStr,
            subTitle: chartObj.subtitle?.textStr,
            xAxis : {
              description: xDesc,
              labels: xLabels
            },
            yAxis: {
              description: yDesc,
            },
            data:{
              series : seriesData
            },
            type: chartObj.series[0]?.type,
            noOfDataPoints: maxCount
          }
          //console.log(chartData);
          messageObj = {"messageFrom": "imageCharts", "charts": chartData};
          window.postMessage(messageObj, "*");
        });
        document.getElementById(divId).appendChild(chartButton);
      }
  }
},1000);
}