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
const kWall = 200;

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

let rawObjectInfo: any = [];

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

let guidance: boolean = false;

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

    // if the user presses a key to move back and forth
    if (event.data.breakKey != undefined) {
      breakKey = event.data.breakKey;
    }

    if (event.data.start != undefined) {
      guidance = true;
      haplyType = Type.SEGMENT;
    }

    if (curSegmentDone) {
      tLastChangeSegment = event.data.tKeyPressTime;
    }

    if (event.data.renderingData != undefined) {
      hapticMode = event.data.mode;
      let rendering = event.data.renderingData.entities;

      objHeaderIndex = rendering.findIndex((x: { entityType: string }) => x.entityType == "object")
      console.log(objHeaderIndex);

      for (let i = 0; i < rendering.length; i++) {

        if (rendering[i].entityType == "object") {
          const name = rendering[i].name;
          const centroid = rendering[i].centroid.map((x: any) => transformToVector(x));
          const coords = rendering[i].contours;
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

        if (rendering[i].entityType == "segment") {
          const coords = rendering[i].contours;
          const tCoords = coords.map((y: any) => y.map((x: any) => mapCoords(x.coordinates)));
          let baseSeg = { coords: coords }
          let tSeg = { coords: tCoords }
          baseSegmentData.push(baseSeg);
          segmentData.push(tSeg);
        }

        let audio = {
          name: rendering[i].name,
          offset: rendering[i].offset,
          duration: rendering[i].duration,
          entityType: rendering[i].entityType,
          isStaticSegment: rendering[i].entityType.includes("static") ? true : false
        }
        audioData.push(audio);
      }

      objects = createObjs(objectData);
      segments = createSegs(segmentData);
      console.log(audioData);

      rawObjectInfo = [];

      this.self.postMessage({
        positions: { x: positions.x, y: positions.y },
        objectData: createObjs(baseObjectData),
        segmentData: createSegs2(baseSegmentData),
      });
    }
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

          //console.log(obj);

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

    fEE.set(0, 0);
  }

  /************************ END SETUP CODE ************************* */

  /**********  BEGIN CONTROL LOOP CODE *********************/

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
            audioHapticContours(segments, [3000, 3000, 6]); // prev: 15
          }
          break;
        }
        case Type.OBJECT: {
          if (objects.length != 0) {
            audioHapticContours(objects, [2000, 2000, 20]);
          }
          break;
        }
        case Type.IDLE:
          break;
      }
    }

    //else {
    //passiveGuidance();
    //  posEE.set(posEE.clone().multiply(200));
    //}

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
  NextFromAudio,
  Escape
}

let breakKey: BreakKey;

let tLastChangePoint: number = Number.NEGATIVE_INFINITY;
let tLastChangeSegment: number = Number.NEGATIVE_INFINITY;
let tLastChangeSubSegment: number = Number.NEGATIVE_INFINITY;
let tHoldTime: number = Number.NEGATIVE_INFINITY;
let tHoldAudioTime: number = Number.NEGATIVE_INFINITY;


// unused atm

// Let's us know if that the main script is playing audio.
let doneWithAudio = false;

// To let main script know it's time to play audio.
let sendAudioSignal = false;

//TODO: rewrite all of this within a class

let tSavedSubSegmentDuration = 0;

function audioHapticContours(segments: SubSegment[][], timeIntervals: [number, number, number]) {

  const t0 = timeIntervals[0];
  const t1 = timeIntervals[1];
  const t2 = timeIntervals[2];

  switch (mode) {

    case Mode.InitializeAudio: {
      //entityIndex = 0;//objHeaderIndex; //doneWithSegments == true ? objHeaderIndex : 0;
      entityIndex = haplyType == Type.SEGMENT ? 0 : objHeaderIndex - 1;
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
        console.log("region");
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

    // start ~1.5 after button press
    case Mode.WaitHaply: {
      if (Date.now() - tHoldTime > 1500) {
        mode = Mode.MoveHaply;
        tLastChangePoint = Date.now();
      }
      break;
    }
    case Mode.MoveHaply: {
      // TODO: fix this, it's ugly
      activeGuidance(segments, t0, t1, t2);
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
  tSubSegmentDuration: number, tSubSegmentPointDuration: number) {

  tSavedSubSegmentDuration = tSubSegmentPointDuration;
  // first check for breakout conditions
  if (breakKey != BreakKey.None) {
    fEE.set(0, 0); // reset forces

    if (breakKey == BreakKey.Escape) {
      finishTracing();
      haplyType = Type.IDLE;
      mode = Mode.Reset;
    }


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
      switchMode();
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
        if (currentSubSegmentPointIndex >= currentSubSegment.coordinates.length) {
          finishSubSegment();
        }
        tLastChangePoint = Date.now();
      } else {

        const coord = currentSubSegment.coordinates[currentSubSegmentPointIndex];
        moveToPos(coord);
      }
    }
  }
}

function finishTracing() {
  currentSegmentIndex = 0;
  currentSubSegmentIndex = 0;
  curSegmentDone = false;
  console.log("all segments traced");
  mode = Mode.Reset;
}

function switchMode() {

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
  //savedEntityIndex = entityIndex;
  //console.log("saved entity index is", savedEntityIndex);
  //entityIndex = 11;
  //mode = Mode.StartAudio;
  currentSubSegmentPointIndex = 0;
  curSubSegmentDone = true;
  //waitForInput = true;
  tLastChangeSubSegment = Date.now();
  fEE.set(0, 0);
}

function moveToPos(vector: Vector) {

  const targetPos = new Vector(vector.x, vector.y);
  const xDiff = targetPos.subtract(convPosEE.clone());

  // P controller
  const multiplier = xDiff.mag() > 0.01 ? ((14.377 * xDiff.mag()) + 1.8168) : 2

  let constrainedMax = currentSegmentIndex == 0 && currentSubSegmentIndex == 0 ? 6 : 4
  const kx = xDiff.multiply(springConst).multiply(multiplier);

  // D controller
  const dx = (convPosEE.clone()).subtract(prevPosEE);
  const dt = 1 / 1000;
  const c = 3;
  const cdxdt = (dx.divide(dt)).multiply(c);

  // I controller
  const cumError = dx.add(dx.multiply(dt));
  const ki = 170;

  console.log("I:", cumError.x * ki, cumError.y * ki);
  let fx = constrain(kx.x + cdxdt.x + ki * cumError.x, -1 * constrainedMax, constrainedMax);
  let fy = constrain(kx.y + cdxdt.y + ki * cumError.y, -1 * constrainedMax, constrainedMax);
  force.set(fx, fy);
  //console.log(xDiff.x, xDiff.y, cdxdt.x, cdxdt.y, force.x, force.y);
  fEE.set(graphics_to_device(force));
}

function constrain(val: number, min: number, max: number) {
  return val > max ? max : val < min ? min : val;
}

export function transformPtToWorkspace(coords: [number, number]): Vector {
  const x = (coords[0] * 0.1333) - 0.064; // 0.064 before, 0.080, -0.05
  const y = (coords[1] * 0.0833) + 0.0368; // 0.0368 before, -0.0278
  return { x, y };
}

/////////////////////////////////////////

export function ReversetransformPtToWorkspace(v: Vector) {
  const x = (v.x + 0.064) / 0.1333;
  const y = (v.y - 0.0368) / 0.0833;
  return new Vector(x, y);
}

// wall rendering

//vibrates if inside a bounding box

// transform image normalized coordinates into haply frame of reference
// based on calibration on haply from extreme left/right and bottom positions

//checks to see if the end effector is inside a specified shape (currently only checks for rectanlges)
function inShape(coords: any, ee_pos: any) {
  if ((ee_pos.x >= coords[0] && ee_pos.x <= coords[2]) && (ee_pos.y >= coords[1] && ee_pos.y <= coords[3])) {
    return true;
  }
  else {
    return false;
  }
}
