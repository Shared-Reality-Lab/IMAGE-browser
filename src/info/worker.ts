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
let widgetOne: any;
let pantograph;
let haplyBoard;

// store required handler json
let objectData: any = []
let segmentData: any = []; //SubSegment[][] = []

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
let doneGuidance: any;

// to track the status of the drop down menu
let hapticMode: any;

// keeps track of many times a message has been received in the worker
let messageCount = 0;

// export type Segment = {
//   coordinates: [number, number][],
//   x?: number,
//   y?: number, 
//   trace?: false
// }

export type SubSegment = {
  //coordinates: [number, number][]
  coordinates: Vector[]
}

const segment: SubSegment[] = [];
const segments: SubSegment[][] = [];

//const segments: 
const keyState: number = 0;

enum Mode {
  START,
  WAIT,
  MOVE,
  SKIP,
  RESET
}

let haplyMode: Mode = Mode.START;

enum Type {
  SEGMENT,
  OBJECT,
}

let haplyType: Type = Type.SEGMENT;

self.addEventListener("message", async function (event) {
  // get image data from the main script
  if (event) {

    if (event.data.keyState) {
      console.log(event.data.keyState);
    }

    console.log(event.data.renderingData.entityInfo);

    hapticMode = event.data.mode;
    let rendering = event.data.renderingData.entityInfo;

    let objHeaderIndex = (rendering.length - 1) - rendering.reverse().findIndex((x: { name: string; }) => x.name === "Text");//rendering.indexOf(x => x.name == "Text", 1);
    rendering.reverse();
    for (var i = 1; i < objHeaderIndex; i++) {
      let seg = {
        centroid: rendering[i].centroid,
        coords: rendering[i].contourPoints.map((y: any) => y.map((x: any) => mapCoords(x.coordinates)))
      }
      segmentData.push(seg);
    }
    for (var i = objHeaderIndex + 1; i < rendering.length; i++) {
      let obj = {
        name: rendering[i].name,
        centroid: rendering[i].centroid,
        coords: rendering[i].contourPoints
      }
      objectData.push(obj);
    }
    createSegs();
    //activeGuidance(segments, 50, 50);
    //set initial target location first object centroid coordinates
    //targetLoc.set(imageToHaply(objectData[0].centroid[0], objectData[0].centroid[1]));
  }

  function createSegs() {
    for (const segs of segmentData) {
      const segment: Array<SubSegment> = [];
      const segmentCoords = segs.coords[0];
      // seg -> coords -> (0 or 1 with diff areas/centroid/coords)
      // each part of the segment
      for (let i = 0; i < segmentCoords.length; i++) {
        let coordinates = segmentCoords[i];
        segment[i] = { coordinates };
      }
      segments.push(segment);
    }
    // console.log(segments);
  }

  /**
   * @param coordinates 2-D array containing [x, y] for each segment.
   * @returns transformed coordinates for Haply workspace.
   */
  function mapCoords(coordinates: [number, number][]): Vector[] {
    coordinates = coordinates.map(x => transformCoords(x));
    return coordinates;
  }

  function transformCoords(coords: [number, number]): Vector {
    //const x = (coords[0] - 0.5) / 5.0;
    //const y = (coords[1] + 0.2) / 8.0;
    const x = coords[0];
    const y = coords[1];
    return { x, y };
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
  let func: any;

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

    //posEE.set(device_to_graphics(positions));
    //convPosEE = posEE.clone();

    if (guidance) {
      posEE.set(device_to_graphics(posEE));

      switch (haplyType) {
        case Type.SEGMENT: {
          lineFollowing(segments, -1 * 200);
          break;
        }
        case Type.OBJECT: {
          break;
        }
      }
    }

    else {
      posEE.set(posEE.clone().multiply(200));
    }

    // if (event.data.flag) {
    //   if (event.data.flag == 2) {
    //     console.log("double press");
    //   }
    //   else if (event.data.flag == 1) {
    //     console.log("single press");
    //   }
    // }

    // // compute forces based on existing position
    // if (hapticMode === "Active") {
    //   activeGuidance();
    // }
    // else if (hapticMode === "Passive") {
    //   passiveGuidance();
    // }
    // else if (hapticMode === "Vibration") {
    //   vib_mode();
    // }

    // // send required data back
    const data = {
      positions: { x: positions[0], y: positions[1] },
      objectData: objectData,
      segmentData: segments
    }

    // // sending end effector position back to info.ts to update visuals
    this.self.postMessage(data);

    // calculate and set torques
    widgetOne.set_device_torques(fEE.toArray());
    widgetOne.device_write_torques();

    await new Promise(r => setTimeout(r, 1));
  }

  /**********  END CONTROL LOOP CODE *********************/
});

/**
 * 
 * An array of arrays.
 * Each 'subarray'[0] (why!?) has the ['coordinates']
 * @param segments 
 */

// Indicates whether we are done tracing the current segment.
let curSegmentDone: boolean = false;

// Indicates whether we are done tracing the current subsegment.
let curSubSegmentDone: boolean = false;

// Indicates the current index of segments being traced.
let currentSegmentIndex: number = 0;

// Indicates the current index of the sub-segment being traced.
let currentSubSegmentIndex: number = 0;

// Indicates the current index (point) in the current segment
let currentSubSegmentPointIndex: number = 0;

// Wait for current user input.
let waitForInput: boolean = false;

// Tells us if we are in guidance mode.
let guidance: boolean = false;

let tLastChangePoint: number = Number.NEGATIVE_INFINITY;
let tLastChangeSegment: number = Number.NEGATIVE_INFINITY;
let tLastChangeSubSegment: number = Number.NEGATIVE_INFINITY;
let tHoldTime: number = Number.NEGATIVE_INFINITY;
let tResetTime: number = Number.NEGATIVE_INFINITY;
let tResetDuration: number = 2000;

// class Segments {

//   x: number = 0;
//   y: number = 0;

//   constructor() {

//   }

// }

function lineFollowing(segments: SubSegment[][], springConst: number) {

  // no segments to run, end
  if (segments.length == 0) {
    return;
  }

  switch (haplyMode) {
    case Mode.START: {
      tHoldTime = Date.now();
      haplyMode = Mode.WAIT;
      break;
    }

    // start ~2 after button press
    case Mode.WAIT: {
      if (Date.now() - tHoldTime > 2000) {
        haplyMode = Mode.MOVE;
        // set the current index (increments each time)
        currentSegmentIndex = currentSegmentIndex == 0 ? 0 : currentSegmentIndex + 1;
      }
      break;
    }
    case Mode.MOVE: {
      activeGuidance(segments, 1000, 1000, 1000);
      break;
    }
    case Mode.RESET: {
      break;
    }
  }
}

function activeGuidance(segments: SubSegment[][], tSegmentDuration: number,
  tSubSegmentDuration: number, tSubSegmentPointDuration: number) {

  let currentSegment: SubSegment[] = segments[currentSegmentIndex];
  let currentSubSegment: SubSegment = currentSegment[currentSubSegmentIndex];

  // if we are done with the current segment...
  if (curSegmentDone) {

    // check to see if this is the last segment
    // if so, end guidance
    if (currentSegmentIndex === segments.length) {
      guidance = false;
    }

    // if not, move on to the next index
    // but make sure we're NOT waiting for input
    if (waitForInput) {
      guidance = false;
      // wait 2000 ms before going to next segment
    } else if (Date.now() - tLastChangeSegment > 2000) {
      curSegmentDone = false;
      waitForInput = false;
      tLastChangeSubSegment = Date.now();
    }
  } else if (curSubSegmentDone) {

    // check to see if this is the last subsegment in the list
    if (currentSubSegmentIndex == currentSubSegment.coordinates.length - 1) {
      curSegmentDone = true;
      waitForInput = true;
      tLastChangeSegment = Date.now();
      currentSubSegmentIndex = 0; // added extra
    }

    // if not, move on to next subsegment
    // but make sure we're not waiting for input
    if (waitForInput) {
      guidance = false;
    }
    else if (Date.now() - tLastChangeSubSegment > 2000) {
      curSubSegmentDone = false;
      waitForInput = false;
      tLastChangePoint = Date.now();
    }
  }

  // we're not done with the current subsegment
  else {
    // check if we have to move to the next point in the subsegment
    if (Date.now() - tLastChangePoint > tSubSegmentPointDuration) {
      currentSubSegmentPointIndex++;
      // check to see if we've made it to the last point, then we know it's time to increment the subseg index
      if (currentSubSegmentPointIndex >= (currentSegment.length - 1)) {
        currentSubSegmentPointIndex = 0;
        currentSubSegmentIndex++;
        curSubSegmentDone = true;
        waitForInput = true;
        tLastChangeSubSegment = Date.now();
      }
      tLastChangePoint = Date.now();
    } else {
      moveToPos(currentSegment[currentSubSegmentPointIndex], 200)
    }
  }
}

/**
 * Moves the end-effector to a position on the workspace.
 * @param vector the x/y position of the point
 * @param springConst the stiffness (should be no longer)
 */
function moveToPos(vector: Vector, springConst: number) {

  const xPos = vector.x;
  const yPos = vector.y;

  const targetPos: Vector =
  {
    x: xPos / 200,
    y: yPos / 250
  };

  const xDiff: Vector = posEE.clone().subtract(targetPos);

  const multiplier = (xDiff.mag() * 200) < 3 ? 0.8 : 1
  force.set(xDiff.multiply(-200).multiply(multiplier));
  fEE.set(graphics_to_device(force));
}

/////////////////////////////////////////

// function activeGuidance() {
//   if (!doneGuidance) {
//     // get difference to target location from current pos
//     var xDiff = (convPosEE).subtract(targetLoc);

//     // get force multiplier based on distance
//     var multiplier = (xDiff.mag()) < threshold ? (xDiff.mag() / threshold) : 1;

//     // set force
//     force.set(xDiff.multiply(-200).multiply(multiplier));
//     fEE.set(graphics_to_device(force));
//   }
//   else
//     fEE.set(0, 0);
// }

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
function imageToHaply(vec: Vector) {
  var x = (vec.x - 0.5) / 5.0;
  var y = (vec.y + 0.2) / 8.0;

  return new Vector(x, y);
}

function device_to_graphics(deviceFrame: any) {
  return new Vector(-deviceFrame[0], deviceFrame[1]);
}

function graphics_to_device(graphicsFrame: any) {
  return graphicsFrame.set(-graphicsFrame.x, graphicsFrame.y);
}

//checks to see if the end effector is inside a specified shape (currently only checks for rectanlges)
function inShape(coords: any, ee_pos: any) {
  if ((ee_pos.x >= coords[0] && ee_pos.x <= coords[2]) && (ee_pos.y >= coords[1] && ee_pos.y <= coords[3])) {
    return true;
  }
  else {
    return false;
  }
}
