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

// TODO: set object types

// declaration of haply specific variables
const widgetOneID = 5;
let widgetOne: any;
let pantograph;
let haplyBoard;

// store required handler json
let objectData: any = []
let segmentData: any = []; //SubSegment[][] = []
let audioData: any = [];

// threshold used for force calculation
const threshold = 0.02;

// store the angles and positions of the end effector, which are sent back to info.ts
let angles = new Vector(0, 0);
let positions = new Vector(0, 0);

// end-effector x/y coords
let posEE = new Vector(0, 0);
let prevPosEE = new Vector(0.5, 0);

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

// to track the status of the drop down menu
let hapticMode: any;

// keeps track of many times a message has been received in the worker
let messageCount = 0;

export type SubSegment = {
  coordinates: Vector[]
}

const segments: SubSegment[][] = [];

//const segments: 
const keyState: number = 0;

export const enum Mode {
  StartAudio,
  PlayAudio,
  DoneAudio,
  StartHaply,
  WaitHaply,
  MoveHaply,
  Reset
}

let mode = Mode.StartAudio;

enum Type {
  SEGMENT,
  OBJECT,
}

let haplyType = Type.SEGMENT;

let guidance: boolean = true;

// self.addEventListener("close", async function (event) {
//   console.log("close");
//   widgetOne.set_device_torques([0, 0]);
//   widgetOne.device_write_torques();  
// });

function device_to_graphics(deviceFrame: any) {
  return new Vector(-deviceFrame[0], deviceFrame[1]);
}

function graphics_to_device(graphicsFrame: any) {
  return graphicsFrame.set(-graphicsFrame.x, graphicsFrame.y);
}

self.addEventListener("message", async function (event) {
  // get image data from the main script
  if (event) {

    if (event.data.doneWithAudio != undefined) {
      doneWithAudio = event.data.doneWithAudio;
    }

    // handshake
    if (event.data.receivedAudioSignal != undefined
      && sendAudioSignal == true) {
      sendAudioSignal = !event.data.receivedAudioSignal;
      console.log("acknowledged!");
    }

    waitForInput = event.data.waitForInput;
    if (waitForInput == false) {
      guidance = true;
    }
    breakOutKey = event.data.breakOutKey;

    // if (curSubSegmentDone) {
    //   tLastChangeSubSegment = event.data.tKeyPressTime;
    // }
    if (curSegmentDone) {
      tLastChangeSegment = event.data.tKeyPressTime;
    }

    if (event.data.renderingData != undefined) {
      hapticMode = event.data.mode;
      let rendering = event.data.renderingData.entityInfo;

      let objHeaderIndex = (rendering.length - 1) - rendering.reverse().findIndex((x: { name: string; }) => x.name === "Text");//rendering.indexOf(x => x.name == "Text", 1);
      rendering.reverse();
      for (let i = 1; i < objHeaderIndex; i++) {
        let seg = {
          centroid: rendering[i].centroid,
          coords: rendering[i].contourPoints.map((y: any) => y.map((x: any) => mapCoords(x.coordinates)))
        }
        segmentData.push(seg);
      }
      for (let i = objHeaderIndex + 1; i < rendering.length; i++) {
        let obj = {
          name: rendering[i].name,
          centroid: rendering[i].centroid,
          coords: rendering[i].contourPoints
        }
        objectData.push(obj);
      }
      createSegs();

      // fetch audio data
      // TODO: rewrite all of this to use just a single loop
      rendering.forEach((x: { name: string; offset: number; duration: number; }) => {
        const isStaticSegment = x.name == "Text" ? true : false;
        let audio = {
          name: x.name,
          offset: x.offset,
          duration: x.duration,
          isStaticSegment: isStaticSegment
        }
        audioData.push(audio);
      });

      this.self.postMessage({
        positions: { x: positions.x, y: positions.y },
        objectData: objectData,
        segmentData: segments,
      });
    }
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
  }

  function mapCoords(coordinates: [number, number][]): Vector[] {
    coordinates = coordinates.map(x => transformPtToWorkspace(x));
    return coordinates;
  }

  function transformPtToWorkspace(coords: [number, number]): Vector {
    const x = (coords[0] * 0.1345) - 0.0537;
    const y = (coords[1] * 0.0834) + 0.0284;
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

  // Tells us if we are in guidance mode.

  // if (hapticMode === "Active") {
  //   (func = (function* () {
  //     // jump to new loc based on a timer
  //     for (let idx = 1; idx <= objectData.length; idx++) {
  //       yield setTimeout(() => {
  //         if (idx === objectData.length) {
  //           doneGuidance = true;
  //         } else {
  //           // set next target location
  //           targetLoc.set(imageToHaply(new Vector(objectData[idx].centroid[0], objectData[idx].centroid[1])));
  //         }
  //         func.next();
  //       }, 2000);

  //     }
  //   })()).next();
  // }

  while (true) {

    // find position and angle data
    widgetOne.device_read_data();
    angles = widgetOne.get_device_angles();
    positions = widgetOne.get_device_position(angles);

    posEE.set(device_to_graphics(positions));
    convPosEE = posEE.clone();

    if (guidance) {
      posEE.set(device_to_graphics(posEE));

      switch (haplyType) {
        case Type.SEGMENT: {
          lineFollowing(segments, 200);
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

    prevPosEE.set(convPosEE.clone());

    //prevPosEE = posEE.clone();
    //console.log(convPosEE.x, convPosEE.y);

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

    // send required data back
    const data = {
      positions:
        { x: positions[0], y: positions[1] },
      waitForInput: waitForInput,
      audioInfo: {
        entityIndex: entityIndex,
        sendAudioSignal: sendAudioSignal,
      }
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

// Index for audio information.
let entityIndex: number = 0;

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

// To determine whether the user has pressed a key to move to the next subsegment.
let breakOutKey: boolean = false;

let tLastChangePoint: number = Number.NEGATIVE_INFINITY;
let tLastChangeSegment: number = Number.NEGATIVE_INFINITY;
let tLastChangeSubSegment: number = Number.NEGATIVE_INFINITY;
let tHoldTime: number = Number.NEGATIVE_INFINITY;
let tHoldAudioTime: number = Number.NEGATIVE_INFINITY;
let tResetTime: number = Number.NEGATIVE_INFINITY;
let tResetDuration: number = 2000;
let tAudioWaitTime = 1000;

// Let's us know if that the main script is playing audio.
let doneWithAudio = false;

// To let main script know it's time to play audio.
let sendAudioSignal = false;

function lineFollowing(segments: SubSegment[][], springConst: number) {

  // no segments to run, end
  if (segments.length == 0) {
    return;
  }
  switch (mode) {

    case Mode.StartAudio: {
      // if we are done with all segments, end
      if (entityIndex > audioData.length) {
        mode = Mode.Reset;
      }
      else {
        // tell main script we need audio played
        sendAudioSignal = true;
        mode = Mode.PlayAudio;
      }
      break;
    }
    case Mode.PlayAudio: {
      // wait for a response from main script to see if we're done
      if (doneWithAudio) {
        mode = Mode.DoneAudio;
        tHoldAudioTime = Date.now();
      }
      break;
    }
    case Mode.DoneAudio: {

      // reset flag
      doneWithAudio = false;
      let audioSeg = audioData[entityIndex];
      if (audioSeg.isStaticSegment) {
        mode = Mode.StartAudio;
      }
      else {
        mode = Mode.StartHaply;
      }
      entityIndex++;
      break;
    }
    case Mode.StartHaply: {
      console.log("it's haply time!");
      tHoldTime = Date.now();
      mode = Mode.WaitHaply;
      break;
    }

    // start ~2 after button press
    case Mode.WaitHaply: {
      if (Date.now() - tHoldTime > 2000) {
        mode = Mode.MoveHaply;
        // set the current index (increments each time)
        //currentSegmentIndex = currentSegmentIndex == 0 ? 0 : currentSegmentIndex + 1;
      }
      break;
    }
    case Mode.MoveHaply: {
      activeGuidance(segments, 3000, 4000, 15, springConst);
      break;
    }
    case Mode.Reset: {
      break;
    }
  }
}

function activeGuidance(segments: SubSegment[][], tSegmentDuration: number,
  tSubSegmentDuration: number, tSubSegmentPointDuration: number, springConst: number) {

  let currentSegment: SubSegment[] = segments[currentSegmentIndex];
  let currentSubSegment: SubSegment = currentSegment[currentSubSegmentIndex];

  if (!breakOutKey) {

    //TODO: further abstract some of these into functions
    // if we are done with the current segment...
    if (curSegmentDone) {

      // check to see if this is the last segment
      if (currentSegmentIndex !== segments.length) {

        //mode = Mode.START_AUDIO;

        // if not, move on to the next index
        // but make sure we're NOT waiting for input

        //if (waitForInput) {
        //  console.log("waiting for input");
        //  guidance = false;
          // wait 2000 ms before going to next segment
        //} else {
          if (Date.now() - tLastChangeSegment > tSegmentDuration) {
            mode = Mode.StartAudio;
            startNewSegment();
            //startNewSegment();
        //  }
        }
      }
      // // we are done with all segments, reset haply etc here
      else {
        console.log("all segments traced");
        guidance = false;
      }

    } else if (curSubSegmentDone) {

      // check to see if this is the last subsegment in the list
      if (currentSubSegmentIndex != currentSegment.length) {
        // if not, move on to next subsegment
        // but make sure we're not waiting for input

        if (waitForInput) {
          guidance = false;
        }
        else {
          if (Date.now() - tLastChangeSubSegment > tSubSegmentDuration) {
            startNewSubSegment();
          }
        }
      }

      else {
        finishSegment();
      }
    }

    // we're not done with the current subsegment
    else {
      // check if we have to move to the next point in the subsegment
      if (Date.now() - tLastChangePoint > tSubSegmentPointDuration) {
        currentSubSegmentPointIndex++;
        //console.log(currentSubSegment);
        // check to see if we've made it to the last point, then we know it's time to increment the subseg index
        if (currentSubSegmentPointIndex >= (currentSubSegment.coordinates.length - 1)) {
          finishSubSegment();
        }
        tLastChangePoint = Date.now();
      } else {
        const coord = currentSubSegment.coordinates[currentSubSegmentPointIndex];
        moveToPos(coord, springConst)
        console.log(currentSegmentIndex, currentSubSegmentIndex, currentSubSegmentPointIndex);
      }
    }
  }
  else {
    // if the user wants to stop, then just finish the segment
    finishSubSegment();
    breakOutKey = !breakOutKey;
  }
}

function startNewSegment() {
  curSegmentDone = false;
  waitForInput = false;
  // currentSegmentIndex++;
  // currentSubSegmentIndex = 0;
}


function startNewSubSegment() {
  curSubSegmentDone = false;
  waitForInput = false;
  tLastChangePoint = Date.now();
}

function finishSegment() {
  console.log("finish seg");
  currentSegmentIndex++;
  currentSubSegmentIndex = 0;
  curSegmentDone = true;
  curSubSegmentDone = false;
  waitForInput = true;
  fEE.set(0, 0);
}

function finishSubSegment() {
  currentSubSegmentPointIndex = 0;
  currentSubSegmentIndex++;
  curSubSegmentDone = true;
  //waitForInput = true;
  tLastChangeSubSegment = Date.now();
  fEE.set(0, 0);
}

function moveToPos(vector: Vector, springConst: number) {

  const targetPos = new Vector(vector.x, vector.y);
  const xDiff = targetPos.subtract(convPosEE.clone());

  // get the angle between this and the next position
  //const angle = Math.abs(xDiff.toAngles().phi); 
  //const multiplier = angle > 1.5 ? 1.4 : 1;
  const kx = xDiff.multiply(springConst);//.multiply(multiplier);

  const dx = (convPosEE.clone()).subtract(prevPosEE);
  const dt = 1 / 1000;
  const c = 1.2;
  const cdxdt = (dx.divide(dt)).multiply(c);

  const fx = kx.x;// + cdxdt.x;
  const fy = kx.y;// + cdxdt.y;
  force.set(fx, fy);
  fEE.set(graphics_to_device(force));
}

/////////////////////////////////////////

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

//checks to see if the end effector is inside a specified shape (currently only checks for rectanlges)
function inShape(coords: any, ee_pos: any) {
  if ((ee_pos.x >= coords[0] && ee_pos.x <= coords[2]) && (ee_pos.y >= coords[1] && ee_pos.y <= coords[3])) {
    return true;
  }
  else {
    return false;
  }
}
