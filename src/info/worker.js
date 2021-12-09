import { Vector } from "../hAPI/libraries/vector.js";
import { Board } from "../hAPI/libraries/Board.ts";
import { Actuator } from "../hAPI/libraries/Actuator.ts";
import { Device } from "../hAPI/libraries/Device.ts";
import { Sensor } from "../hAPI/libraries/Sensor.ts";
import { Pwm } from "../hAPI/libraries/Pwm.ts";
import { Pantograph } from "../hAPI/libraries/Pantograph.ts";

console.log("in worker!");
  var rendering;
  var widgetOne;
  var pantograph;
  var widgetOneID = 5;
  var angles = new Vector(0,0);    
  var positions = new Vector(0, 0);
  var dt = 1/1000.0;
  var haplyBoard;
  var objectData = []

  class DetectedObject{
    constructor(type, centroid, coords) {
      this.type = type;
      this.centroid = centroid;
      this.coords = coords;
    }
  }

  self.addEventListener("message", async function(e) {
    // this is where we receive the image data from the main script
    if (e) {
      rendering = e.data; // assinged the data array received from main script
      
      for (var i = 0; i < rendering.length; i++) {
        let obj = rendering[i];
        let centroid = obj.centroid;
        let coords = obj.coords;
        let type = obj.type;
        objectData.push(new DetectedObject(type, centroid, coords));
      }

  } 
 
  
    /************ BEGIN SETUP CODE *****************/
    haplyBoard = new Board();
    await haplyBoard.init();
  
    widgetOne           = new Device(widgetOneID, haplyBoard);
    pantograph          = new Pantograph();
  
    widgetOne.set_mechanism(pantograph);
  
    widgetOne.add_actuator(1, 1, 2); //CCW
    widgetOne.add_actuator(2, 0, 1); //CW
  
    widgetOne.add_encoder(1, 1, 241, 10752, 2);
    widgetOne.add_encoder(2, 0, -61, 10752, 1);
    widgetOne.device_set_parameters();
    // var g = new Vector(10, 20, 2);
    /************************ END SETUP CODE ************************* */
  
    /**********  BEGIN CONTROL LOOP CODE *********************/
    // self.importScripts("runLoop.js")
    while(true) {
 
      widgetOne.device_read_data();
      angles = widgetOne.get_device_angles();
      positions = widgetOne.get_device_position(angles);
 
  
      var data = {
        positions: {x: positions[0], y: positions[1]},
        objectData: objectData
      }
  
      this.self.postMessage(data);
  
      widgetOne.device_write_torques();   
  
      await new Promise(r => setTimeout(r, 1));
    }
    
    /**********  END CONTROL LOOP CODE *********************/
  });
  
  
  
  
  
