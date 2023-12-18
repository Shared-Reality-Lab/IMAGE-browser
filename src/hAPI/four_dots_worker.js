import { Vector } from "./libraries/Vector";
import { Board } from "./libraries/Board";
import { Device } from "./libraries/Device";
import { PantographV3  as Panto2DIYv3} from './libraries/PantographV3';
import { Pantograph as Panto2DIYv1} from "./libraries/Pantograph";
//import * as p5 from "../libraries/p5.min.js";

function closeWorker() {
  console.log("worker before close");
  self.close();
  console.log("worker closed");
  var runLoop = true;
}

var message = "";
var updateMess = function (mess) {
  message = mess;
}

var getMessage = async function (m) {
  if (message == "") {
    return "connect";
  }
  else {
    return message;
  }

}

function HapticSwatch (x,y,r, params) {
    this.center = new Vector(x,y);
    this.radius = r;
    this.k = params.k;
    this.mu = params.mu;
    this.maxAL = params.AL;
    this.maxAH = params.AH;
    this.onsetFlag = false;
    this.active = false;
}

var runLoop = true

/* Device specifications */
var widgetOne;
var pantograph;

var widgetOneID = 5;
var angles = new Vector(0, 0);
var torques = new Vector(0, 0);
var positions = new Vector(0, 0);

/* task space */
var posEE = new Vector(0, 0);
var posEELast = new Vector(0, 0);
var velEE = new Vector(0, 0);
var rDiff = new Vector(0,0);
var swatchRadius = 0.01
// var swatch1 = new HapticSwatch(-0.02,0.06, swatchRadius, {k:0, mu:0, maxAL: 0, maxAH: 10 });
// var swatch2 = new HapticSwatch(0.02, 0.06, swatchRadius, {k:0, mu:0.04, maxAL: 0, maxAH: 0 });
// var swatch3 = new HapticSwatch(-0.02,0.10, swatchRadius, {k:0, mu:0, maxAL: 10, maxAH: 0 });
// var swatch4 = new HapticSwatch(0.02,0.10, swatchRadius, {k:400, mu:0, maxAL: 0, maxAH: 0 });

//point for (100,100)
var swatch1 = new HapticSwatch(0.0806,0.0809, swatchRadius, {k:0, mu:0, maxAL: 0, maxAH: 10 });
//point for (700,100)
var swatch2 = new HapticSwatch(-0.0193, 0.0809, swatchRadius, {k:0, mu:0.7, maxAL: 0, maxAH: 0 });
// point for (700,400)
var swatch3 = new HapticSwatch(-0.0193 ,0.1212, swatchRadius, {k:0, mu:0, maxAL: 10, maxAH: 0 });
// point for (100,400)
var swatch4 = new HapticSwatch(0.086, 0.1212, swatchRadius, {k:400, mu:0, maxAL: 0, maxAH: 0 });

var swatches = [];
swatches.push(swatch1);
swatches.push(swatch2);
swatches.push(swatch3);
swatches.push(swatch4);


var dt = 1 / 1000.0;
var bAir = 0.0;  // air damping coefficient (kg/s)

var rEE = 0.006; // end effector radius

/* Forces */
var fEE = new Vector(0, 0);
var fText = new Vector(0,0);
var force = new Vector(0,0);

/* Device version */
//var newPantograph = 0; // uncomment for 2DIYv1
var newPantograph = 1; // uncomment for 2DIYv3

/* Time variables */
var startTime = 0;
var codeTime = 0;
var promTime = 0;

/* Changing values */
var looptime = 1; // in ms [0.5(2000), 1(1000), 2(500), 4(250)]

/* Device variables */
var haplyBoard;
var speed = 0;
var maxSpeed = 0;

var targetRate = 2000;
var textureConst = (2*Math.PI)/targetRate;
var samp = 0;

self.addEventListener("message", async function (e) {
  /* listen to messages from the main script */

  /************ BEGIN SETUP CODE *****************/
  console.log('in worker');
  
  /* initialize device */
  haplyBoard = new Board();
  await haplyBoard.init();
  console.log(haplyBoard);

  widgetOne = new Device(widgetOneID, haplyBoard);

  /* configure and declare device specifications according to the version */
  if(newPantograph == 1){
    pantograph = new Panto2DIYv3();
    widgetOne.set_mechanism(pantograph);
  
    widgetOne.add_actuator(1, 1, 2); //CCW
    widgetOne.add_actuator(2, 1, 1); //CCW
  
    widgetOne.add_encoder(1, 1, 97.23, 2048 * 2.5 * 1.0194 * 1.0154, 2); //right in theory
    widgetOne.add_encoder(2, 1, 82.77, 2048 * 2.5 * 1.0194, 1); //left in theory
  }else{
    pantograph = new Panto2DIYv1();
    widgetOne.set_mechanism(pantograph);
  
    widgetOne.add_actuator(1, 1, 2); //CCW
    widgetOne.add_actuator(2, 0, 1); //CW
  
    widgetOne.add_encoder(1, 1, 241, 10752, 2);
    widgetOne.add_encoder(2, 0, -61, 10752, 1);
  }

  var run_once = false;


  /************************ END SETUP CODE ************************* */

  /**********  BEGIN CONTROL LOOP CODE *********************/
  while (true) {
    startTime = this.performance.now();
    force = new Vector(0,0);
    if (!run_once) {
      widgetOne.device_set_parameters();
      run_once = true;
    }

    /* read and save device status */
    widgetOne.device_read_data();
    angles = widgetOne.get_device_angles();
    positions = widgetOne.get_device_position(angles);
    posEE.set(positions);

    velEE.set((posEE.clone()).subtract(posEELast).divide(dt));

    /* update "previous" variable */
    posEELast = posEE.clone();
    speed = velEE.mag();
    if(speed > maxSpeed){
      maxSpeed = speed;
    }

    /* haptic physics force calculation */
    swatches.forEach((swatch)=>{
      //console.log(swatch);
      //rDiff = swatch.center.subtract(posEE);
      rDiff = (posEE.clone()).subtract(swatch.center);
      //console.log(rDiff.mag());
      if(rDiff.mag() < swatch.radius){
        if(!swatch.isActive){
          swatch.isActive = true;
          swatch.onsetFlag = true;
        }
        // Spring Force
        rDiff.setMag(swatch.radius - rDiff.mag());
        // add to total force
        force.set(force.add(rDiff.multiply(swatch.k)));
        var vTh = 0.1;
        var mass = 0.25; // kg
        var fnorm = mass * 9.81;
        // Friction
        var b = fnorm * swatch.mu / vTh;
        if(speed < vTh){
          //console.log("speed less")
          force.set(force.add(((velEE.clone()).multiply(-b))));
        } else {
          //console.log("speed more")
          var normalizedVel = (velEE.clone()).normalize();
          force.set(force.add(normalizedVel.multiply(-swatch.mu * fnorm)));
        }
        // // Texture
        var maxV = vTh;
        // fText Magnitude
        var fTextMagnitude = (Math.min(swatch.maxAH, speed * swatch.maxAH / maxV) * Math.sin(textureConst * 150 * samp)) +
                             (Math.min(swatch.maxAL, speed * swatch.maxAL / maxV) * Math.sin(textureConst * 25 * samp))
        let vEEClone = velEE.clone();
        vEEClone = vEEClone.rotate(Math.PI/2);
        vEEClone.setMag(fTextMagnitude);
        fText.set(vEEClone);
        force.set(force.add(fText));
        
      } else {
        if(swatch.active){
          swatch.active = false;
          swatch.onsetFlag = true;
        }
      }
    });
    samp = (samp+1) % targetRate;
    // graphics_to_device function call
    fEE.set(-force.x, force.y);

    var data = [angles[0], angles[1], positions[0], positions[1], newPantograph]
    /* post message to main script with position data */
    this.self.postMessage(data);

    /* send forces to device */
    widgetOne.set_device_torques(fEE.toArray());
    widgetOne.device_write_torques();

    codeTime = this.performance.now();
    promTime = looptime - (codeTime - startTime);
    if(promTime > 0){
      // run every ${looptime} ms
      await new Promise(r => setTimeout(r, promTime));        
    }
  }

  /**********  END CONTROL LOOP CODE *********************/
});




