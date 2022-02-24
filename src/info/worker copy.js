/*
 * Copyright (c) 2021 IMAGE Project, Shared Reality Lab, McGill University
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * and our Additional Terms along with this program.
 * If not, see <https://github.com/Shared-Reality-Lab/IMAGE-browser/LICENSE>.
 */
import { Vector } from "../hAPI/libraries/vector.js";
import { Board } from "../hAPI/libraries/Board.ts";
import { Device } from "../hAPI/libraries/Device.ts";
import { Pantograph } from "../hAPI/libraries/Pantograph.ts";

// declaration of haply specific variables
const widgetOneID = 5;
let widgetOne;
let pantograph;
let haplyBoard;

// store required handler json
let objectData = []

// threshold used for force calculation
const threshold = 0.02;

// store the angles and positions of the end effector, which are sent back to info.ts
let angles = new Vector(0, 0);
let positions = new Vector(0, 0);

// end-effector x/y coords
let posEE = new Vector(0, 0);

// transformed end-effector coordinates
let convPosEE = new Vector(0, 0);

// location of target point
let targetLoc = new Vector(0, 0);

// get force needed for torques
let force = new Vector(0, 0);

// the force applied to the end effector
let fEE = new Vector(0, 0);

// for force shading, sotring the last 4 end effector force vectors
let fEE_prev1 = new Vector(0, 0);
let fEE_prev2 = new Vector(0, 0);
let fEE_prev3 = new Vector(0, 0);
let fEE_prev4 = new Vector(0, 0);

// end effector radius
const rEE = 0.006;

let fDamping = new Vector(0, 0);

// spring constant for wall rendering [N/m]
const kWall = 800;

// force calculation for the wall rendering
let fWall = new Vector(0, 0);

// gets assinged a random force vector for vibration mode
let randForce = new Vector(0, 0);
let applyVibration = false; //boolean to check if vibration condition has been met

// indicate we've iterated through all the points in an image
let doneGuidance;

// to track the status of the drop down menu
let hapticMode;

//keeps track of many times a message has been received in the worker
let messageCount = 0;

/*PID Variables */

let cumerror = new Vector(0,0);
const smoothing = 0.8;
const P= 0;
const I = 0;
const D =0;

let buff= new Vector(0,0);
let olde = new Vector(0,0);



self.addEventListener("message", async function (event) {
  // get image data from the main script
  if (event) {

    hapticMode = event.data.mode;
    let rendering = event.data.renderingData;

    for (var i = 0; i < rendering.length; i++) {
      let obj = {
        centroid: rendering[i].centroids,
        coords: rendering[i].coords,
        text: rendering[i].text
      }
      objectData.push(obj);
    }

    //set initial target location first object centroid coordinates
    targetLoc.set(imageToHaply(objectData[0].centroid[0], objectData[0].centroid[1]));
  }

  /************ BEGIN SETUP CODE *****************/
  if (messageCount < 1) {
    messageCount++;
    haplyBoard = new Board();
    await haplyBoard.init();

    widgetOne = new Device(widgetOneID, haplyBoard);
    pantograph = new Pantograph();

    widgetOne.set_mechanism(pantograph);

    widgetOne.add_actuator(1, 1, 2); //CCW
    widgetOne.add_actuator(2, 0, 1); //CW

    widgetOne.add_encoder(1, 1, 241, 10752, 2);
    widgetOne.add_encoder(2, 0, -61, 10752, 1);
    widgetOne.device_set_parameters();
  }

  /************************ END SETUP CODE ************************* */

  /**********  BEGIN CONTROL LOOP CODE *********************/
  let func;

    (func = (function* () {
      // jump to new loc based on a timer
      for (let idx = 1; idx <= objectData.length; idx++) {
        yield setTimeout(() => {
          if (idx === objectData.length) {
            doneGuidance = true;
          } else {
            // set next target location
            targetLoc.set(imageToHaply(new Vector(objectData[idx].centroid[0], objectData[idx].centroid[1])));
          }
          func.next();
        }, 2000);

      }
    })()).next();
  

  while (true) {

    // find position and angle data
    widgetOne.device_read_data();
    angles = widgetOne.get_device_angles();
    positions = widgetOne.get_device_position(angles);

    posEE.set(device_to_graphics(positions));
    convPosEE = posEE.clone();
    // if(!doneGuidance){
    //   PID(targetLoc.x, targetLoc.y);
    // }
    // compute forces based on existing position
    // if (hapticMode === "Active") {
    //   activeGuidance();
    // }
    // else if (hapticMode === "Passive") {
    //   passiveGuidance();
    // }
    // else if (hapticMode === "Vibration") {
    //   vib_mode();
    // }

    // send required data back
    var data = {
      positions: { x: positions[0], y: positions[1] },
      objectData: objectData
    }

    // sending end effector position back to info.ts to update visuals
    this.self.postMessage(data);

    //calculate and set torques
    widgetOne.set_device_torques(fEE.toArray());
    widgetOne.device_write_torques();

    await new Promise(r => setTimeout(r, 1));
  }

  /**********  END CONTROL LOOP CODE *********************/
});

function activeGuidance() {
  if (!doneGuidance) {
    // get difference to target location from current pos
    var xDiff = (convPosEE).subtract(targetLoc);

    // get force multiplier based on distance
    var multiplier = (xDiff.mag()) < threshold ? (xDiff.mag() / threshold) : 1;

    // set force
    force.set(xDiff.multiply(-600).multiply(multiplier));
    fEE.set(graphics_to_device(force));
  }
  else
    fEE.set(0, 0);
}

// function PID(x_m, y_m){
  
//   let timeDif = performance.now()-oldtime;
//   //x_m = currentx
//   //y_m = currenty
//   xE =convPosEE.x;
//   yE =convPosEE.y;

//   let dist_X= x_m-xE;
//   cumerror.x = dist_X*timeDif*0.000001
//   let dist_Y = y_m-yE;
//   cumerror.y = dist_Y*timeDif*0.000001

//   if(timeDif>0){
//     buff.x= (dist_X-olde.x)/timedif*1000;
//     buff.y= (dist_Y-olde.y)/timedif*1000;            

//     diff.x = smoothing*diff.x + (1.0-smoothing)*buff.x;
//     diff.y = smoothing*diff.y + (1.0-smoothing)*buff.y;
//     olde.x = dist_X;
//     olde.y = dist_Y;
//     oldtime= performance.now();
//   }
//   let fee_x = P*dist_X + I*cumerror.x + D*diff.x;
//   let fee_y = P*dist_Y + I*cumerror.y + D*diff.y;

//   fEE.set(fee_x,fee_y);
//   console.log("fEE is :", fEE);
// }

// transform image normalized coordinates into haply frame of reference
// based on calibration on haply from extreme left/right and bottom positions
function imageToHaply(vec) {
  var x = (vec.x - 0.5) / 5.0;
  var y = (vec.y + 0.2) / 8.0;

  return new Vector(x, y);
}

function device_to_graphics(deviceFrame) {
  return new Vector(-deviceFrame[0], deviceFrame[1]);
}

function graphics_to_device(graphicsFrame) {
  return graphicsFrame.set(-graphicsFrame.x, graphicsFrame.y);
}



