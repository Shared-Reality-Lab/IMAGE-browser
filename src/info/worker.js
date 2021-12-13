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

  var posEE = new Vector(0,0);   
  var posEELast =new Vector(0,0); 
  var velEE =new Vector(0,0);

  var b_EE = 10.0;
  var rEE = 0.005;
  var fEE = new Vector(0, 0);
  //for force shading
  var fEE_prev1 = new Vector(0, 0);
  var fEE_prev2 = new Vector(0, 0);
  var fEE_prev3 = new Vector(0, 0);
  var fEE_prev4 = new Vector(0, 0);

  var rEE = 0.006;
  var fDamping = new Vector(0, 0);

  var fWall = new Vector(0, 0);
  var kWall = 800; // N/m
  var penWall = new Vector(0, 0);

  var f = new Vector(0.05,0.001);
  var vib = false;
  var value;

  var targetLoc = new Vector(0, 0); // location of target point
  var force = new Vector(0, 0); // get force needed for torques
  var doneGuidance;
  var threshold = 0.02;

  var dt = 1/1000.0;
  var haplyBoard;
  var objectData = []

  var run_once = false;
  var message_count =0;

  class DetectedObject{
    constructor(type, centroid, coords) {
      this.type = type;
      this.centroid = centroid;
      this.coords = coords;
    }
  }

  self.addEventListener("message", async function(e) {
    // this is where we receive the image data from the main script
    this.console.log(e);
    if (e) {
      
      rendering = e.data[1]; // assinged the data array received from main script
      value = e.data[0];
      for (var i = 0; i < rendering.length; i++) {
        let obj = rendering[i];
        let centroid = obj.centroids;
        let coords = obj.coords;
        let type = obj.text;
        objectData.push(new DetectedObject(type, centroid, coords));
      }
      targetLoc.set(image_to_haply(objectData[0].centroid[0], objectData[0].centroid[1]));

  } 
  this.console.log(value);
  
    /************ BEGIN SETUP CODE *****************/
    if(message_count <1){
      message_count++;
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
    }
    // var g = new Vector(10, 20, 2);
    /************************ END SETUP CODE ************************* */
  
    /**********  BEGIN CONTROL LOOP CODE *********************/
  let func;
  
  if(value == "active"){
    // get new 
    (func = (function*() {
      for (let idx = 1; idx <= objectData.length; idx++) {
        yield setTimeout(() => {
          if (idx == objectData.length) {
            doneGuidance = true;
          }
          else
            targetLoc.set(image_to_haply(new Vector(objectData[idx].centroid[0], objectData[idx].centroid[1])));  
          func.next();
        }, 2000);

      }
    })()).next();
  }
    // self.importScripts("runLoop.js")
    while(true) {
      vib =false;
 
      if (!run_once){
        widgetOne.device_set_parameters();
        run_once = true;
        // console.log(objectdata[0]);

      }
      widgetOne.device_read_data();
      angles = widgetOne.get_device_angles();
      positions = widgetOne.get_device_position(angles);

      posEELast = posEE;
      posEE.set(positions);  
      velEE = posEE.subtract(posEELast);
      fDamping = velEE.multiply(-b_EE);
 
  
      var data = {
        positions: {x: positions[0], y: positions[1]},
        objectData: objectData
      }
  
      this.self.postMessage(data);

      
      if(value == "Passive"){
        this.console.log("in passive mode");
        vib_mode();
      }
      else if(value == "Active"){
        this.console.log("in active mode");
        activeGuidance();
      }
      else{
        this.console.log("not in any mode!");
      }
    

      widgetOne.set_device_torques(fEE.toArray());  
      widgetOne.device_write_torques();   
  
      await new Promise(r => setTimeout(r, 1));
    }
    
    /**********  END CONTROL LOOP CODE *********************/
  });
  

  function to_haply_frame(v) {
    var x = (v.x - 0.5009) / 6.2895;
    var y = (v.y + 0.2004) / 10.017;
    return new Vector(x, y);
  }
  
  
  function inShape(coords,ee_pos){
    if((ee_pos.x > coords[0] && ee_pos.x < coords[2]) && (ee_pos.y > coords[1] && ee_pos.y < coords[3])) {
      return true;
    }
    else{
      return false;
    }

  }
  
  function vib_mode(){
    
    // let conv_posEE = new Vector(posEE.x * (-0.1/0.070)+ 0.7*2, (posEE.y- 0.022) *20);
      // let conv_posEE = new Vector(posEE.x * (-0.5/0.070)+ 0.7, (posEE.y -0.022) / 0.078);
      let conv_posEE = new Vector(posEE.x *-5+0.5, posEE.y *7.81);
      
      var nearestx = 99.9;
      var nearesty = 99.9;
      var nearestObj = "";
      var x_line;
      var y_line;

      for(let i = 0; i < objectData.length; i++)  {
        let ulx = (objectData[i].coords[0]); //upper-left x coord
        let uly = (objectData[i].coords[1]); // upper-left y coord
        let lrx = (objectData[i].coords[2]); //lower-right x
        let lry = (objectData[i].coords[3]);  //lower right y 
        let objName  = objectData[i].type;
        // this.console.log(objName);
        // this.console.log(lrx);

        /* x direction */
        /* if y coord is between line seg */
        //console.log(ulx, uly, lrx, lry, conv_posEE.x, conv_posEE.y);
        if (conv_posEE.y < lry && conv_posEE.y > uly) {
          //check distance between vertical lines;
          let x_dist1 = Math.abs((ulx-2*rEE) - conv_posEE.x);
          let x_dist2 = Math.abs((lrx+2*rEE) - conv_posEE.x);
          if (x_dist1 < x_dist2 && x_dist1 < nearestx)  {
              x_line = ulx;
              nearestx = x_dist1;
              nearestObj = objName;
          }
          else if (x_dist2 < x_dist1 && x_dist2 < nearestx) {
              x_line = lrx;
              nearestx = x_dist2;
              nearestObj = objName;
          }
        }

        /* y direction, the same method */
        if (conv_posEE.x > ulx && conv_posEE.x < lrx) {
          //check distance between vertical lines;
          let y_dist1 = Math.abs((uly-2*rEE) - conv_posEE.y);
          let y_dist2 = Math.abs((lry+2*rEE) - conv_posEE.y);
          if (y_dist1 < y_dist2 && y_dist1 < nearesty)  {
              y_line = uly;
              nearesty = y_dist1;
              nearestObj = objName;
          }
          else if (y_dist2 < y_dist1 && y_dist2 < nearesty) {
              y_line = lry;
              nearesty = y_dist2;
              nearestObj = objName;
          }
        }

         
      if(inShape(objectData[i].coords,conv_posEE)){
        vib = true;
        // let temp = Vector.random2D().mult(0.02);
        let temp = new Vector((Math.random()*100-75)/500, (Math.random()*100-75)/500, 0);
        // this.console.log("the temp is: ", temp);
        f.set((Math.random()*100-75)/1000, (Math.random()*100-75)/1000);
        // this.console.log("the vector f is:" ,f);

      }

      }
      // this.console.log(nearestObj);


      fWall.set(0,0);
      let threshold = 0.02;
      // this.console.log("this is the xline: ");
      // this.console.log(x_line);
      // this.console.log("this is the corrected ee pos:");
      // this.console.log(conv_posEE);
      if (nearestx < nearesty && nearestx < threshold)  {
        if(x_line < conv_posEE.x) {
          penWall.set(kWall* (threshold-(x_line - conv_posEE.x)), 0);
        }
        else{
          penWall.set(-kWall* (threshold-(conv_posEE.x - x_line)), 0);
        }
        if (Math.abs(conv_posEE.x - x_line) < rEE)  {
          fWall.set(0,0);
        }
        else{
          fWall = penWall;
        }
        
      }
      else if (nearesty < nearestx && nearesty < threshold){
        if(y_line < conv_posEE.y) {
          penWall.set(0, -kWall*(threshold-(y_line - conv_posEE.y)));
        }
        else{
          penWall.set(0, kWall*(threshold-(conv_posEE.y - y_line)));
        }
        if (Math.abs(conv_posEE.x - x_line) < rEE)  {
          fWall.set(0,0);
        }
        else{
          fWall = penWall;
        }
      }
      fEE = (fWall.clone()).multiply(-1);
      fEE.add(fDamping);

      fEE.set(0.4 * fEE.x + 0.3 * fEE_prev1.x + 0.15 * fEE_prev2.x + 0.1 * fEE_prev3.x + 0.05 * fEE_prev4.x,
        0.4 * fEE.y + 0.3 * fEE_prev1.y + 0.15 * fEE_prev2.y + 0.1 * fEE_prev3.y + 0.05 * fEE_prev4.y);

      fEE_prev1 = fEE.clone();
      fEE_prev2 = fEE_prev1.clone();
      fEE_prev3 = fEE_prev2.clone();
      fEE_prev4 = fEE_prev3.clone();

      let f_coef = -35.0;
      let x_dist = Math.abs(0.5 - conv_posEE.x);
      let y_dist = conv_posEE.y;
      let xy_dist = new Vector(conv_posEE.x-0.5, conv_posEE.y).mag();
      let multiplier = 1;
      if (xy_dist < 0.3)  {
        multiplier = 1.0 / ((xy_dist) + 0.5);
      }
      let comp_coeff = (1.0 - (y_dist - 0.5) * x_dist) * multiplier;
      if(vib){
        fEE = f.multiply(f_coef * comp_coeff);
      }

  }

  function activeGuidance(){
    let convPosEE = posEE.clone();

    // compute forces based on existing position
    if (!doneGuidance) {
      var xDiff = (convPosEE).subtract(targetLoc);
      var multiplier = (xDiff.mag()) < threshold ? (xDiff.mag() / threshold) : 1;

      force.set(xDiff.multiply(-600).multiply(multiplier));
      fEE.set(graphics_to_device(force));   
    }
    else
      fEE.set(0, 0);

  }


  function image_to_haply(v) {
    var x = (v.x - 0.5) / 5.0;
    var y = (v.y + 0.2) / 8.0;
  
    return new Vector(x, y);
  }
  
  function device_to_graphics(deviceFrame){
    return new Vector(-deviceFrame[0], deviceFrame[1]);
  }
  
  function graphics_to_device(graphicsFrame){
    return graphicsFrame.set(-graphicsFrame.x, graphicsFrame.y);
  }
    
  
