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

  if (hapticMode === "Active") {
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
  }

  while (true) {

    // find position and angle data
    widgetOne.device_read_data();
    angles = widgetOne.get_device_angles();
    positions = widgetOne.get_device_position(angles);

    posEE.set(device_to_graphics(positions));
    convPosEE = posEE.clone();

    // compute forces based on existing position
    if (hapticMode === "Active") {
      activeGuidance();
    }
    else if (hapticMode === "Passive") {
      passiveGuidance();
    }
    else if (hapticMode === "Vibration") {
      vib_mode();
    }

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

// wall rendering
function passiveGuidance() {
  //scaling the end effector position vector to match normalized coordinates from handler
  let convPosEE = new Vector(posEE.x * 5 + 0.5, posEE.y * 8.07 - 0.21);

  //declaration of comparision variables;
  let nearestX = 99.9;
  let nearestY = 99.9;
  let nearestObj = "";
  let wallXLine; // rendering a vertical line
  let wallYLine; //rendering a horizontal line

  // checking the distances vectros for each bounding box 
  for (let i = 0; i < objectData.length; i++) {
    let upperLeftX = (objectData[i].coords[0]);
    let upperLeftY = (objectData[i].coords[1]);
    let lowerRightX = (objectData[i].coords[2]);
    let lowerRighty = (objectData[i].coords[3]);
    let objName = objectData[i].text;

    /* x direction */
    /* if y coord is between line seg */
    if (convPosEE.y < lowerRighty && convPosEE.y > upperLeftY) {

      //check distance between vertical lines;
      let xDistToLeft = Math.abs((upperLeftX - 2 * rEE) - convPosEE.x);
      let xDistToRight = Math.abs((lowerRightX + 2 * rEE) - convPosEE.x);

      if (xDistToLeft < xDistToRight && xDistToLeft < nearestX) {

        wallXLine = upperLeftX;
        nearestX = xDistToLeft;
        nearestObj = objName;

      } else if (xDistToRight < xDistToLeft && xDistToRight < nearestX) {
        wallXLine = lowerRightX;
        nearestX = xDistToRight;
        nearestObj = objName;

      }
    }

    /* y direction, the same method */
    if (convPosEE.x > upperLeftX && convPosEE.x < lowerRightX) {

      //check distance between horizontal lines;
      let yDistToUpper = Math.abs((upperLeftY - 2 * rEE) - convPosEE.y);
      let yDistToLower = Math.abs((lowerRighty + 2 * rEE) - convPosEE.y);

      if (yDistToUpper < yDistToLower && yDistToUpper < nearestY) {

        wallYLine = upperLeftY;
        nearestY = yDistToUpper;
        nearestObj = objName;

      } else if (yDistToLower < yDistToUpper && yDistToLower < nearestY) {

        wallYLine = lowerRighty;
        nearestY = yDistToLower;
        nearestObj = objName;

      }
    }
  }

  fWall.set(0, 0);

  /** checking to see if wall should be rendered horizontally or vertically **/

  if (nearestX < nearestY && nearestX < threshold) {
    if (wallXLine < convPosEE.x) {
      fWall.set(kWall * (threshold - (wallXLine - convPosEE.x)), 0);
    } else {
      fWall.set(-kWall * (threshold - (convPosEE.x - wallXLine)), 0);
    }
    //setting no force if it's on the line
    if (Math.abs(convPosEE.x - wallXLine) < rEE) {
      fWall.set(0, 0);
    }
  } else if (nearestY < nearestX && nearestY < threshold) {

    if (wallYLine < convPosEE.y) {
      fWall.set(0, -kWall * (threshold - (wallYLine - convPosEE.y)));
    } else {
      fWall.set(0, kWall * (threshold - (convPosEE.y - wallYLine)));
    }
    //setting no force if it's on the line
    if (Math.abs(convPosEE.x - wallXLine) < rEE) {
      fWall.set(0, 0);
    }
  }
  //asigning the forces calculated in fWall to the end effector 
  fEE = (fWall.clone()).multiply(-1);
  fEE.add(fDamping);

  /** keeping track of the past 4 end effector force vectors to smoothen the forces/fluctuations on the end effector**/
  fEE.set(0.3 * fEE.x + 0.15 * fEE_prev1.x + 0.075 * fEE_prev2.x + 0.05 * fEE_prev3.x + 0.025 * fEE_prev4.x,
    0.3 * fEE.y + 0.15 * fEE_prev1.y + 0.075 * fEE_prev2.y + 0.05 * fEE_prev3.y + 0.025 * fEE_prev4.y);

  fEE_prev1 = fEE.clone();
  fEE_prev2 = fEE_prev1.clone();
  fEE_prev3 = fEE_prev2.clone();
  fEE_prev4 = fEE_prev3.clone();

}

//vibrates if inside a bounding box
function vib_mode() {
  //boolean to check if EE should vibrate
  applyVibration = false;

  //same end effector vector scaling
  let convPosEE = new Vector(posEE.x * 5 + 0.5, posEE.y * 8.07 - 0.21);

  //a coefficient for force vector
  let fCoef = -25.0;

  // vector components (x &y) fo the end effector posiiton and the magnitude of the vector
  let xDist = Math.abs(0.5 - convPosEE.x);
  let yDist = convPosEE.y;
  let xyDist = new Vector(convPosEE.x - 0.5, convPosEE.y).mag();

  //overall force scaling
  let forceMultiplier = 1;

  /*checking to see if magnitude is within limit and scaling forceMultiplier based on magnitude of the distance*/
  if (xyDist < 0.3) {
    forceMultiplier = 1.0 / ((xyDist) + 0.5);
  }

  //computed coefficient for force calcualtion
  let compCoeff = (1.0 - (yDist - 0.5) * xDist) * forceMultiplier;

  /*** Iterating through all the boudning boxes to check if we are in one 
       and if we are in a shape we break out of the for loop and assign the 
       random force to cause vibration***/
  for (let i = 0; i < objectData.length; i++) {

    if (inShape(objectData[i].coords, convPosEE)) {
      randForce.set((Math.random() * 100 - 75) / 1000, (Math.random() * 100 - 75) / 1000);
      applyVibration = true;
      break;
    }
  }
  if (applyVibration) {
    fEE.set(randForce.multiply(fCoef * compCoeff));
  }
}

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

//checks to see if the end effector is inside a specified shape (currently only checks for rectanlges)
function inShape(coords, ee_pos) {
  if ((ee_pos.x >= coords[0] && ee_pos.x <= coords[2]) && (ee_pos.y >= coords[1] && ee_pos.y <= coords[3])) {
    return true;
  }
  else {
    return false;
  }
}