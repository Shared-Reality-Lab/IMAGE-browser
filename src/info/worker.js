import { Vector } from "../hAPI/libraries/vector.js";
import { Board } from "../hAPI/libraries/Board.ts";
import { Actuator } from "../hAPI/libraries/Actuator.ts";
import { Device } from "../hAPI/libraries/Device.ts";
import { Sensor } from "../hAPI/libraries/Sensor.ts";
import { Pwm } from "../hAPI/libraries/Pwm.ts";
import { Pantograph } from "../hAPI/libraries/Pantograph.ts";
// import { IMAGEResponse } from "../types/response.schema.d.ts";


console.log("in worker!");
  var rendering;
  var widgetOne;
  var pantograph;
 
  var widgetOneID = 5;
  
  //self.importScripts("../hAPI/libraries/vector.js");
  
  var angles = new Vector(0,0);    
  var torques = new Vector(0,0);
  var positions = new Vector(0, 0);
  
  /* task space */
  var posEE = new Vector(0,0);   
  var posEE_copy = new Vector(0,0);
  var posEELast =new Vector(0,0); 
  var velEE =new Vector(0,0);
  dt = 1/1000.0;
  
  var posBall = new Vector(0, 0.05);  
  var velBall = new Vector(0, 0);    
  
  var posEEToBall;
  var posEEToBallMagnitude;
  
  var velEEToBall;
  var velEEToBallMagnitude;
  
  var rEE = 0.006;
  var rEEContact = 0.006;
  
  var rBall = 0.02;
  
  var mBall = 0.15;  // kg
  var kBall = 445;  // N/m
  var bBall = 3.7;
  var penBall = 0.0;  // m
  var bAir = 0.0;  // kg/s
  var fGravity = new Vector(0, 9.8*mBall);
  var dt = 1/1000.0;
  
  var fBall = new Vector(0 ,0);    
  var fContact = new Vector(0, 0);
  var fDamping = new Vector(0, 0);
  
  /* virtual wall parameters */
  var fWall = new Vector(0, 0);
  var kWall = 800; // N/m
  var bWall = 2; // kg/s
  var penWall = new Vector(0, 0);
  
  var posWallLeft = new Vector(-0.07, 0.03);
  var posWallRight = new Vector(0.07, 0.03);
  var posWallBottom = new Vector(0.0, 0.1);
  
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
       console.log("got data");
       console.log(rendering);
      // console.log(rendering[0]);
      // console.log(rendering[0].text);
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
  

    var g = new Vector(10, 20, 2);
    // console.log(haplyBoard);
    /************************ END SETUP CODE ************************* */
  
    /**********  BEGIN CONTROL LOOP CODE *********************/
    // self.importScripts("runLoop.js")
    while(true) {
 
      widgetOne.device_read_data();
      angles = widgetOne.get_device_angles();
      positions = widgetOne.get_device_position(angles);
      posEE.set(positions);
  
      velEE.set((posEE.clone()).subtract(posEELast).divide(dt));
      posEELast = posEE;
  
     /* haptic physics force calculation */
    
      /* ball and end-effector contact forces */
      posEEToBall = (posBall.clone()).subtract(posEE);
      posEEToBallMagnitude = posEEToBall.mag();
    
      penBall = posEEToBallMagnitude - (rBall + rEE);
      /* end ball and end-effector contact forces */
  
      /* ball forces */
      if(penBall < 0){
      rEEContact = rEE + penBall;
  
      fContact = posEEToBall.normalize();
  
      velEEToBall = velBall.clone().subtract(velEE);
      velEEToBall = fContact.clone().multiply(velEEToBall.dot(fContact));
      velEEToBallMagnitude = velEEToBall.mag();
      
      /* since penBall is negative kBall must be negative to ensure the force acts along the end-effector to the ball */
      fContact = fContact.multiply((-kBall * penBall) - (bBall * velEEToBallMagnitude));
    }
    else {
      rEEContact = rEE;
      fContact.set(0, 0);
    }
  
      /* end ball forces */ 
      
      /* forces due to damping */
      fDamping = (velBall.clone()).multiply(-bAir);
      /* end forces due to damping*/
      
      /* forces due to walls on ball */
      fWall.set(0, 0);
  
      /* left wall */
      penWall.set((posBall.x - rBall) - posWallLeft.x, 0);
      if(penWall.x < 0){
        fWall = fWall.add((penWall.multiply(-kWall))).add((velBall.clone()).multiply(-bWall));
      }
      
      /* bottom wall */
      penWall.set(0, (posBall.y + rBall) - posWallBottom.y);
      if(penWall.y > 0){
        fWall = fWall.add((penWall.multiply(-kWall))).add((velBall.clone()).multiply(-bWall));
      }
      
      /* right wall */
      penWall.set((posBall.x + rBall) - posWallRight.x, 0);
      if(penWall.x > 0){
        fWall = fWall.add((penWall.multiply(-kWall))).add((velBall.clone()).multiply(-bWall));
      }
      /* end forces due to walls on ball*/
      
      
      /* sum of forces */
      fBall = (fContact.clone()).add(fGravity).add(fDamping).add(fWall);      
      let fEE = (fContact.clone()).multiply(-1);
      // fEE.set(graphics_to_device(fEE));
      /* end sum of forces */
  
      // /* dynamic state of ball calculation (integrate acceleration of ball) */
      posBall = (((fBall.clone()).divide(2*mBall)).multiply(dt*dt)).add((velBall.clone()).multiply(dt)).add(posBall);
      velBall = (((fBall.clone()).divide(mBall)).multiply(dt)).add(velBall);
      // /*end dynamic state of ball calculation */
  
      var data = {
        angles: {x: angles[0], y: angles[1]},
        positions: {x: positions[0], y: positions[1]},
        posBall: posBall,
        objectData: objectData
      }
  
      this.self.postMessage(data);
  
      widgetOne.set_device_torques(fEE.toArray());
      widgetOne.device_write_torques();
        
      // renderingForce = false;    
  
      await new Promise(r => setTimeout(r, 1));
    }
    
    /**********  END CONTROL LOOP CODE *********************/
  });
  
  
  
  
  
