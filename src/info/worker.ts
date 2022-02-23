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
import { convexhull } from './convex-hull';

// TODO: set object types

// declaration of haply specific variables
const widgetOneID = 5;
let widgetOne: any;
let pantograph;
let haplyBoard;

// store required handler json
let baseObjectData: any = [];
let objectData: any = []
let segmentData: any = []; //SubSegment[][] = []
let baseSegmentData: any = [];
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

// Index for where objects begin.
let objHeaderIndex: number = 0;

export type SubSegment = {
  coordinates: Vector[],
  bounds?: [number, number, number, number]
}

let segments: SubSegment[][] = [];
let objects: SubSegment[][] = [];

//const segments: 
const keyState: number = 0;

export const enum Mode {
  InitializeAudio,
  StartAudio,
  PlayAudio,
  DoneAudio,
  StartHaply,
  WaitHaply,
  MoveHaply,
  Reset
}

let mode = Mode.InitializeAudio;

export const enum Type {
  SEGMENT,
  OBJECT,
  IDLE
}


// To determine whether the user has pressed a key to move to the next subsegment.
//let breakOutKey: boolean = false;


let haplyType = Type.IDLE;

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

    // unused?
    waitForInput = event.data.waitForInput;
    if (waitForInput == false) {
      guidance = true;
    }

    // if the user presses a key to move back and forth
    if (event.data.breakKey != undefined) {
      breakKey = event.data.breakKey;
    }

    if (event.data.start != undefined) {
      haplyType = Type.SEGMENT;
    }

    // if (curSubSegmentDone) {
    //   tLastChangeSubSegment = event.data.tKeyPressTime;
    // }
    if (curSegmentDone) {
      tLastChangeSegment = event.data.tKeyPressTime;
    }

    if (event.data.renderingData != undefined) {
      hapticMode = event.data.mode;
      let rendering = event.data.renderingData.entityInfo;

      objHeaderIndex = (rendering.length - 1) - rendering.reverse().findIndex((x: { name: string; }) => x.name === "Text");//rendering.indexOf(x => x.name == "Text", 1);
      rendering.reverse();

      //TODO check if covers all segments
      for (let i = 1; i < objHeaderIndex; i++) {

        const coords = rendering[i].contourPoints;
        const tCoords = coords.map((y: any) => y.map((x: any) => mapCoords(x.coordinates)));

        let baseSeg = { coords: coords }
        let tSeg = { coords: tCoords }

        baseSegmentData.push(baseSeg);
        segmentData.push(tSeg);
      }
      
      console.log(baseSegmentData);

      segments = createSegs(segmentData);

      for (let i = objHeaderIndex + 1; i < rendering.length; i++) {

        const name = rendering[i].name;
        const centroid = rendering[i].centroid.map((x: any) => transformToVector(x));
        const coords = rendering[i].contourPoints;
        const tCentroid = rendering[i].centroid.map((x: any) => transformPtToWorkspace(x))

        let baseObj = {
          name: name,
          centroid: centroid,
          coords: coords
        }

        let tObj = {
          name: name,
          centroid: tCentroid,
          coords: coords
        }

        baseObjectData.push(baseObj);
        objectData.push(tObj);
      }
      //console.log("objectData", objectData);
      objects = createObjs(objectData);

      //console.log("objects", objects);

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

      //console.log("audioData", audioData);

      this.self.postMessage({
        positions: { x: positions.x, y: positions.y },
        objectData: createObjs(baseObjectData),
        segmentData: createSegs2(baseSegmentData),
      });
    }
    //activeGuidance(segments, 50, 50);
    //set initial target location first object centroid coordinates
    //targetLoc.set(imageToHaply(objectData[0].centroid[0], objectData[0].centroid[1]));
  }

  function createSegs(segmentInfo: any): SubSegment[][] {
    let data: SubSegment[][] = [];
    for (const segs of segmentInfo) {
      const segment: Array<SubSegment> = [];
      const segmentCoords = segs.coords[0];
      // seg -> coords -> (0 or 1 with diff areas/centroid/coords)
      // each part of the segment
      for (let i = 0; i < segmentCoords.length; i++) {
        let coordinates = segmentCoords[i];
        segment[i] = { coordinates };
      }
      data.push(segment);
    }
    return data;
  }

  // todo: get rid of
  function createSegs2(segmentInfo: any): SubSegment[][] {
    let data: SubSegment[][] = [];
    for (const segs of segmentInfo) {
      const segment: Array<SubSegment> = [];
      const segmentCoords = segs.coords[0];
      // seg -> coords -> (0 or 1 with diff areas/centroid/coords)
      // each part of the segment
      for (let i = 0; i < segmentCoords.length; i++) {
        let coordinates = segmentCoords[i].coordinates;
        segment[i] = { coordinates };
      }
      data.push(segment);
    }
    return data;
  }

  function createObjs(objectData: any): SubSegment[][] {
    let data: SubSegment[][] = [];
    let j = 0;
    for (const obj of objectData) {
      const object: Array<SubSegment> = [];
      //const objCentroids = objs.centroid[0];
      // seg -> coords -> (0 or 1 with diff areas/centroid/coords)
      // each part of the segment
      if (obj.centroid.length == 1) {
        for (let i = 0; i < obj.centroid.length; i++) {
          let coordinates = [obj.centroid[i]];
          let bounds = obj.coords[i];
          object[i] = { coordinates, bounds };
        }
      }
      // if we have more than 1 point, i.e., grouped object
      // then we'll make a convex hull
      else {
        // make hull from the obj centroids and then upsample
        const objCoords: Vector[] = obj.centroid;
        const hull: Vector[] = convexhull.makeHull(objCoords);
        const coordinates: Vector[] = upsample(hull);
        object[0] = { coordinates };
      }
      data.push(object);
    }
    j++;
    return data;
  }

  function upsample(pointArray: Vector[]) {
    // contour index in this particular object is made up of several poconsts
    // n lines, p poconsts for each line
    let upsampledSeg = [];

    for (let n = 0; n < pointArray.length - 1; n++) {

      let upsampleSubSeg: Array<Vector> = [];

      const currentPoint = new Vector(pointArray[n].x, pointArray[n].y);
      const nextPoint = new Vector(pointArray[n + 1].x, pointArray[n + 1].y);

      const x1 = currentPoint.x;
      const y1 = currentPoint.y;
      const x2 = nextPoint.x;
      const y2 = nextPoint.y;
      const moveSpeed = 2000;

      const m = (y2 - y1) / (x2 - x1);
      const c = m == Number.POSITIVE_INFINITY ? 0 : y2 - (m * x2);
      const euclidean1 = currentPoint.dist(nextPoint);

      // console.log("dist b/w 2 points", euclidean1);

      const samplePoints = Math.round(moveSpeed * euclidean1);
      // console.log("no of points: ", samplePoints);

      const sampleDistX = Math.abs(x2 - x1);
      const sampleDistY = Math.abs(y2 - y1);

      //console.log(sampleDistX, sampleDistY);

      for (let v = 0; v < samplePoints; v++) {
        const distX = (sampleDistX / (samplePoints - 1)) * v;
        const distY = (sampleDistY / (samplePoints - 1)) * v;

        //console.log("dists", distX, distY);

        let xLocation = 0;
        let yLocation = 0;

        // case where the x values are the same
        if (x1 == x2) {
          xLocation = x1 + distX;
          yLocation = y2 > y1 ? y1 + distY : y1 - distY; //m * xLocation + c;
        }

        else if (y1 == y2) {
          xLocation = x2 > x1 ? x1 + distX : x1 - distX;
          yLocation = y1 + distY;
        }

        else {
          xLocation = x2 > x1 ? x1 + distX : x1 - distX;
          yLocation = m * xLocation + c;
        }

        //console.log(xLocation, yLocation);

        const p = new Vector(xLocation, yLocation);
        upsampleSubSeg.push(p);
      }
      //console.log(upsampleSubSeg);
      upsampledSeg.push(...upsampleSubSeg);
    }
    return [...upsampledSeg];
  }

  function mapCoords(coordinates: [number, number][]): Vector[] {
    coordinates = coordinates.map(x => transformPtToWorkspace(x));
    return coordinates;
  }

  function arrayToVector(coordinates: [number, number][]): Vector[] {
    coordinates = coordinates.map(a => transformToVector(a));
    return coordinates;
  }
  
  function transformToVector(coords: [number, number]): Vector {
    const x = (coords[0]);
    const y = (coords[1]);
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
          if (segments.length != 0) {
            // this.self.postMessage({
            //   currentHaplyIndex: [currentSegmentIndex, currentSubSegmentIndex]
            // })
            audioHapticContours(segments, [3000, 2000, 15]);
          }
          break;
        }
        case Type.OBJECT: {
          if (objects.length != 0) {
            audioHapticContours(objects, [2000, 2000, 500]);
          }
          break;
        }
        case Type.IDLE:
          break;
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
        sendAudioSignal: sendAudioSignal
      },
      drawingInfo: {
        haplyType: haplyType,
        segIndex: currentSegmentIndex,
        subSegIndex: currentSubSegmentIndex
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

let springConst = 200;

export const enum BreakKey {
  None,
  PreviousHaptic,
  NextHaptic,
  PreviousFromAudio,
  NextFromAudio
}

let breakKey: BreakKey;

let tLastChangePoint: number = Number.NEGATIVE_INFINITY;
let tLastChangeSegment: number = Number.NEGATIVE_INFINITY;
let tLastChangeSubSegment: number = Number.NEGATIVE_INFINITY;
let tHoldTime: number = Number.NEGATIVE_INFINITY;
let tHoldAudioTime: number = Number.NEGATIVE_INFINITY;

// unused atm
let tResetTime: number = Number.NEGATIVE_INFINITY;
let tResetDuration: number = 2000;
let tAudioWaitTime = 1000;

// Let's us know if that the main script is playing audio.
let doneWithAudio = false;

// To let main script know it's time to play audio.
let sendAudioSignal = false;

//TODO: rewrite all of this within a class

function audioHapticContours(segments: SubSegment[][], timeIntervals: [number, number, number]) {

  const t0 = timeIntervals[0];
  const t1 = timeIntervals[1];
  const t2 = timeIntervals[2];

  switch (mode) {

    case Mode.InitializeAudio: {
      //entityIndex = 0;//objHeaderIndex; //doneWithSegments == true ? objHeaderIndex : 0;
      entityIndex = haplyType == Type.SEGMENT ? 0 : objHeaderIndex;
      mode = Mode.StartAudio;
    }

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
      // since we've finished a chunk, move on to the next one
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
      //console.log("enter wait mode");
      //console.log(Date.now(), tHoldTime);
      if (Date.now() - tHoldTime > 1000) {
        mode = Mode.MoveHaply;
      }
      break;
    }
    case Mode.MoveHaply: {
      // TODO: fix this, it's ugly
      activeGuidance(segments, t0, t1, t2, springConst);
      break;
    }
    case Mode.Reset: {
      mode = Mode.InitializeAudio;
      return;
    }
  }
}

// function activeGuidance(this: any, segments: SubSegment[][], tSegmentDuration: number,
//   tSubSegmentDuration: number, tSubSegmentPointDuration: number, springConst: number) {

//   // first check for breakout conditions
//   if (breakKey != BreakKey.None) {
//     fEE.set(0, 0); // reset forces
//     // the user skipped forward
//     if (breakKey == BreakKey.NextHaptic) {
//       finishSubSegment();
//     }
//     if (breakKey == BreakKey.NextFromAudio) {
//       // the only difference with audio is that we don't
//       // increment the subsegment index
//       // because this will be a fresh segment
//       changeSubSegment();
//     }
//     // the user wants to go back
//     if (breakKey == BreakKey.PreviousHaptic) {
//       prevSubSegment();
//     }

//     if (breakKey == BreakKey.PreviousFromAudio) {

//       if (currentSegmentIndex == 0 && entityIndex <= 2) {
//         entityIndex = 0;
//         mode = Mode.StartAudio;
//       }
//       else {
//         // go back one index
//         currentSegmentIndex = currentSegmentIndex == 0 ? 0 : currentSegmentIndex - 1;
//         currentSubSegmentIndex = segments[currentSegmentIndex].length - 1;
//         // TODO: fix where this is incremented/decremented
//         entityIndex--;
//         changeSubSegment();
//       }
//       // }
//     }
//     // reset after we've finished
//     breakKey = BreakKey.None;
//   }

//   else {


//     if (currentSegmentIndex == segments.length) {
//       finishTracing();
//       return;
//     }

//     // let currentSegment: SubSegment[] = segments[currentSegmentIndex];
//     // let currentSubSegment: SubSegment = currentSegment[currentSubSegmentIndex];

//     const s = new Segment(segments);
//     s.setSegmentDuration(10);
//     s.setSubSegmentDuration(100);
//     s.setSubSegmentPointDuration(100);

//     //TODO: further abstract some of these into functions
//     // if we are done with the current segment...
//     if (s.currentSegmentDone) {

//       if (s.timeForNextSegment()) {
//         mode = Mode.StartAudio;
//         s.startNewSegment();
//       }
//     }
//     else if (s.currentSubSegmentDone) {

//       // check to see if this is the last subsegment in the list
//       if (s.currentSubSegmentIndex == s.currentSegment.length) {
//         finishSegment();
//       }
//       else if (s.timeForNextSubSegment())
//         startNewSubSegment();
//     }
//     else {

//       if (s.timeForNextSubSegmentPoint()) {
//         s.currentSubSegmentPointIndex++;

//         if (s.currentSubSegmentPointIndex >= currentSubSegmentPointIndex - 1) {
//           s.finishSubSegment();
//         }
//         s.tLastChangePoint = Date.now();
//       }
//       else {
//         const coord = s.currentSubSegment.coordinates[s.currentSubSegmentPointIndex];
//         moveToPos(coord, springConst);
//       }
//     }
//   }
// }

// class Segment {

//   segments: SubSegment[][]
//   currentSegment: SubSegment[] = [];
//   currentSubSegment: SubSegment = this.currentSegment[0];
//   currentSegmentIndex = 0;
//   currentSubSegmentIndex = 0;
//   currentSubSegmentPointIndex = 0;

//   currentSegmentDone = false;
//   currentSubSegmentDone = false;

//   tSegmentDuration = 0;
//   tSubSegmentDuration = 0;
//   tSubSegmentPointDuration = 0;

//   tLastChangeSegment = 0;
//   tLastChangeSubSegment = 0;
//   tLastChangePoint = 0;

//   constructor(segments: SubSegment[][]) {
//     this.segments = segments;
//   }

//   setSegmentDuration(duration: number) {
//     this.tSegmentDuration = duration;
//   }

//   setSubSegmentDuration(duration: number) {
//     this.tSubSegmentDuration = duration;
//   }

//   setSubSegmentPointDuration(duration: number) {
//     this.tSubSegmentPointDuration = duration;
//   }

//   timeForNextSegment() {
//     if (this.wait(this.tLastChangeSegment, this.tSegmentDuration))
//       return true;
//   }

//   timeForNextSubSegment() {
//     if (this.wait(this.tLastChangeSubSegment, this.tSubSegmentDuration))
//       return true;
//   }

//   timeForNextSubSegmentPoint() {
//     if (this.wait(this.tLastChangePoint, this.tSubSegmentPointDuration))
//       return true;
//   }

//   startNewSegment() {
//     this.currentSegmentDone = false;
//   }

//   startNewSubSegment() {
//     this.currentSubSegmentDone = false;
//     this.tLastChangePoint = Date.now();
//   }

//   finishSegment() {
//     this.currentSegmentIndex++;
//     this.currentSubSegmentIndex = 0;
//     this.currentSubSegmentPointIndex = 0;
//     this.currentSegmentDone = true;
//     this.currentSubSegmentDone = false;
//     //fEE.set(0, 0);
//   }

//   finishSubSegment() {
//     this.currentSubSegmentIndex++;
//     this.changeSubSegment();
//   }

//   private changeSubSegment() {
//     this.currentSubSegmentPointIndex = 0;
//     this.currentSubSegmentDone = true;
//     tLastChangeSubSegment = Date.now();
//     //fEE.set(0, 0);
//   }

//   finishTracing() {
//     this.currentSegmentIndex = 0;
//     this.currentSegmentDone = false;
//   }

//   private wait(tHold: number, duration: number) {
//     if (Date.now() - tHold > duration)
//       return true;
//     return false;
//   }
// }

function activeGuidance(this: any, segments: SubSegment[][], tSegmentDuration: number,
  tSubSegmentDuration: number, tSubSegmentPointDuration: number, springConst: number) {

  // first check for breakout conditions
  if (breakKey != BreakKey.None) {
    fEE.set(0, 0); // reset forces
    // the user skipped forward
    if (breakKey == BreakKey.NextHaptic) {
      finishSubSegment();
    }
    if (breakKey == BreakKey.NextFromAudio) {
      // the only difference with audio is that we don't
      // increment the subsegment index
      // because this will be a fresh segment
      changeSubSegment();
    }
    // the user wants to go back
    if (breakKey == BreakKey.PreviousHaptic) {
      prevSubSegment();
    }

    if (breakKey == BreakKey.PreviousFromAudio) {

      // note our pattern is A.A.H.A.H.A since the first seg is static
      // so we want to make sure our entity index is at least >= 2
      // to play a segment
      // TODO: rewrite, badly written
      // won't work for objects
      if (currentSegmentIndex == 0 && entityIndex <= 2) {
        entityIndex = 0;
        mode = Mode.StartAudio;
      }
      else {
        // go back one index
        currentSegmentIndex = currentSegmentIndex == 0 ? 0 : currentSegmentIndex - 1;
        currentSubSegmentIndex = segments[currentSegmentIndex].length - 1;
        // TODO: fix where this is incremented/decremented
        entityIndex--;
        changeSubSegment();
      }
      // }
    }
    // reset after we've finished
    breakKey = BreakKey.None;
  }

  else {


    if (currentSegmentIndex == segments.length) {
      finishTracing();
      return;
    }

    let currentSegment: SubSegment[] = segments[currentSegmentIndex];
    let currentSubSegment: SubSegment = currentSegment[currentSubSegmentIndex];

    //TODO: further abstract some of these into functions
    // if we are done with the current segment...
    if (curSegmentDone) {

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
            //console.log(currentSegmentIndex, currentSubSegmentIndex);
          }
          else {
            //console.log("waiting", Date.now() - tLastChangeSubSegment);
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

        //console.log(currentSegmentIndex, currentSubSegmentIndex, currentSubSegmentPointIndex);
        // check to see if we've made it to the last point, then we know it's time to increment the subseg index
        if (currentSubSegmentPointIndex >= currentSubSegment.coordinates.length - 1) {
          finishSubSegment();
        }
        tLastChangePoint = Date.now();
      } else {
        const coord = currentSubSegment.coordinates[currentSubSegmentPointIndex];
        moveToPos(coord, springConst);
        console.log(currentSegmentIndex, currentSubSegmentIndex, currentSubSegmentPointIndex);
      }
    }
  }
}

function finishTracing() {
  currentSegmentIndex = 0;
  curSegmentDone = false;
  console.log("all segments traced, time for objects.");
  mode = Mode.Reset;

  switch (haplyType) {
    case Type.SEGMENT: {
      haplyType = Type.OBJECT;
      break;
    }
    case Type.OBJECT: {
      haplyType = Type.IDLE;
      break;
    }
  }
}

function prevSubSegment() {
  // check if this is the first subsegment
  // if so we'll have to change back to audio mode
  if (currentSubSegmentIndex == 0) {
    entityIndex--;
    mode = Mode.StartAudio;
  }
  else {
    currentSubSegmentIndex--;
    changeSubSegment();
  }
}

function startNewSegment() {
  curSegmentDone = false;
  waitForInput = false;
}

function startNewSubSegment() {
  curSubSegmentDone = false;
  waitForInput = false;
  tLastChangePoint = Date.now();
}

function finishSegment() {
  //console.log("finish seg");
  currentSegmentIndex++;
  currentSubSegmentIndex = 0;
  currentSubSegmentPointIndex = 0;
  curSegmentDone = true;
  curSubSegmentDone = false;
  waitForInput = true;
  fEE.set(0, 0);
}

function finishSubSegment() {
  currentSubSegmentIndex++;
  changeSubSegment();
}

/**
 * Called by either prevSubSegment() or nextSubSegment().
 * Change the subsegment index before calling this.
 */
function changeSubSegment() {
  currentSubSegmentPointIndex = 0;
  curSubSegmentDone = true;
  //waitForInput = true;
  tLastChangeSubSegment = Date.now();
  fEE.set(0, 0);
}

function moveToPos(vector: Vector, springConst: number) {

  const targetPos = new Vector(vector.x, vector.y);
  const xDiff = targetPos.subtract(convPosEE.clone());
  //const multiplier = (xDiff.mag()) < threshold ? (xDiff.mag() / threshold) : 1;

  const multiplier = xDiff.mag() > 0.01 ? 2 : 2;

  //const multiplier = xDiff.mag() * 4; // punish larger forces
  //const xDiff = (convPosEE).subtract(targetPos);
  // get the angle between this and the next position
  //const angle = Math.abs(xDiff.toAngles().phi); 
  //const multiplier = angle > 1.5 ? 1.4 : 1;
  const kx = xDiff.multiply(200).multiply(multiplier);



  //console.log(currentSubSegmentPointIndex, xDiff);

  // const dx = (convPosEE.clone()).subtract(prevPosEE);
  // const dt = 1 / 1000;
  // const c = 1.2;
  // const cdxdt = (dx.divide(dt)).multiply(c);

  const fx = constrain(kx.x, -3, 3);
  const fy = constrain(kx.y, -3, 3);
  force.set(fx, fy);
  console.log(force);
  fEE.set(graphics_to_device(force));
}

function constrain(val: number, min: number, max: number) {
  return val > max ? max : val < min ? min : val;
}

export function transformPtToWorkspace(coords: [number, number]): Vector {
  const x = (coords[0] * 0.1333) - 0.05;
  const y = (coords[1] * 0.0833) + 0.0278;
  return { x, y };
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
