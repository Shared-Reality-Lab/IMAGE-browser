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
import { Vector } from "../hAPI/libraries/Vector";
import { Board } from "../hAPI/libraries/Board";
import { Device } from "../hAPI/libraries/Device";
import { Pantograph } from "../hAPI/libraries/Pantograph";
import { convexhull } from './convex-hull';

// TODO: set object types

// declaration of haply specific variables
const widgetOneID = 5;
let widgetOne: any;
let pantograph;
let haplyBoard;

// store required handler json
let baseObjectData: Array<any> = [];
let objectData: Array<any> = []
let segmentData: Array<any> = [];
let baseSegmentData: Array<any> = [];
let audioData: Array<any> = [];

// store the angles and positions of the end effector, which are sent back to info.ts
let angles = new Vector(0, 0);
let positions = new Vector(0, 0);


// end-effector x/y coords
let posEE = new Vector(0, 0);
let prevPosEE = new Vector(0.5, 0);

// transformed end-effector coordinates
let convPosEE = new Vector(0, 0);

// get force needed for torques
let force = new Vector(0, 0);

// the force applied to the end effector
let fEE = new Vector(0, 0);

// keeps track of many times a message has been received in the worker
let messageCount:number = 0;

// Index for where objects begin.
let objHeaderIndex: number = 0;

// Bool to let us know when to start guidance.
let guidance: boolean = false;

/**
 * Defines a subsegment.
 * Contains an array of vectors
 * But also can contain rectangular bounds (for objects)
 */
export type SubSegment = {
  coordinates: Vector[],
  bounds?: [number, number, number, number]
}

let segments: SubSegment[][] = [];
let objects: SubSegment[][] = [];

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

// Type of segment to trace.
export const enum Type {
  SEGMENT,
  OBJECT,
  IDLE
}

let haplyType = Type.IDLE;

function device_to_graphics(deviceFrame: Vector) {
  return new Vector(-deviceFrame.x, deviceFrame.y);
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

    // Read object, segment, and audio data.
    if (event.data.renderingData != undefined) {

      let rendering = event.data.renderingData.entities;
      // index marking object start location
      objHeaderIndex = rendering.findIndex((x: { entityType: string }) => x.entityType == "object")

      for (let i = 0; i < rendering.length; i++) {

        // find objects
        // keep the base object data for sending to main script for renderign
        // but also keep object data for 2DIY
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

        // find segments and map them to 2DIY workspace
        if (rendering[i].entityType == "segment") {
          const coords = rendering[i].contours.map((y: any) => y.map((x: any) => mapCoordsToVec(x.coordinates)));
          const tCoords = rendering[i].contours.map((y: any) => y.map((x: any) => mapCoords(x.coordinates)));
          let baseSeg = { coords: coords }
          let tSeg = { coords: tCoords }
          baseSegmentData.push(baseSeg);
          segmentData.push(tSeg);
        }

        // find audio files
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

      this.self.postMessage({
        positions: { x: positions.x, y: positions.y },
        objectData: createObjs(baseObjectData),
        segmentData: createSegs(baseSegmentData),
      });
    }
  }


  /**
   * Transforms base ML coordinate data for segments into array of segments.
   * @param segmentInfo Array containing objects that contain segment coordinate data.
   * @returns Array of segments.
   */
  function createSegs(segmentInfo: any): SubSegment[][] {
    let data: SubSegment[][] = [];
    for (const segs of segmentInfo) {
      const segment: Array<SubSegment> = [];
      const segmentCoords = segs.coords[0];
      for (let i = 0; i < segmentCoords.length; i++) {
        let coordinates = segmentCoords[i];
        segment[i] = { coordinates };
      }
      data.push(segment);
    }
    return data;
  }

  /**
   * Returns an array of objects in transformed 2DIY plane.
   * @param objectData Array containing objects that contain object coordinate data. 
   * @returns Array of objects.
   */
  function createObjs(objectData: any): SubSegment[][] {
    let data: SubSegment[][] = [];

    // loop through each object entity
    for (const obj of objectData) {
      const object: Array<SubSegment> = [];

      // if ungrouped, just add the object directly
      if (obj.centroid && obj.centroid.length == 1) {
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
    return data;
  }

  /**
   * Linearly upsamples an array of points.
   * @param pointArray Array containing the {x, y} positions in the 2DIY frame of reference.
   * @returns Upsampled array of {x, y} points.
   */
  function upsample(pointArray: Vector[]) {
    let upsampledSeg = [];

    // for each point (except the last one)...
    for (let n = 0; n < pointArray.length - 1; n++) {

      let upsampleSubSeg: Array<Vector> = [];

      // get the location of both points
      const currentPoint = new Vector(pointArray[n].x, pointArray[n].y);
      const nextPoint = new Vector(pointArray[n + 1].x, pointArray[n + 1].y);

      const x1 = currentPoint.x;
      const y1 = currentPoint.y;
      const x2 = nextPoint.x;
      const y2 = nextPoint.y;
      const k = 2000;

      // find vars for equation
      const m = (y2 - y1) / (x2 - x1);
      const c = m == Number.POSITIVE_INFINITY ? 0 : y2 - (m * x2);

      // let the # of sample points be a function of the distance
      const euclidean1 = currentPoint.dist(nextPoint);
      const samplePoints = Math.round(k * euclidean1);

      // get distance between the two points
      const sampleDistX = Math.abs(x2 - x1);
      const sampleDistY = Math.abs(y2 - y1);

      for (let v = 0; v < samplePoints; v++) {
        // find the location of each interpolated point
        const distX = (sampleDistX / (samplePoints - 1)) * v;
        const distY = (sampleDistY / (samplePoints - 1)) * v;

        let xLocation = 0;
        let yLocation = 0;

        // case where the x values are the same
        if (x1 == x2) {
          xLocation = x1 + distX;
          yLocation = y2 > y1 ? y1 + distY : y1 - distY;
        }

        // case where y values are the same
        else if (y1 == y2) {
          xLocation = x2 > x1 ? x1 + distX : x1 - distX;
          yLocation = y1 + distY;
        }

        // standard case
        else {
          xLocation = x2 > x1 ? x1 + distX : x1 - distX;
          yLocation = m * xLocation + c;
        }

        // add new interpolated point to vector array for these two points
        const p = new Vector(xLocation, yLocation);
        upsampleSubSeg.push(p);
      }
      upsampledSeg.push(...upsampleSubSeg);
    }
    return [...upsampledSeg];
  }

  /**
   * Maps coordinates from  anormalized 0 -> 1 coordinate system into the 2DIY frame of reference.
   * @param coordinates Array of 2D coordinate data.
   * @returns Vector array of {x, y} data.
   */
  function mapCoords(coordinates: [number, number][]): Vector[] {

    return coordinates.map(x => transformPtToWorkspace(x));
  }

  function mapCoordsToVec(coordinates: [number, number][]): Vector[] {
    return coordinates.map(x => transformToVector(x));
  }

  /**
   *  Transforms a tuple into a vector.
   * @param coords Tuple containing the coordinate data.
   * @returns Vector containing the x and y positions.
   */
  function transformToVector(coords: [number, number]): Vector {
    const x = (coords[0]);
    const y = (coords[1]);
    return new Vector (x, y);
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
    
    positions = transformToVector(widgetOne.get_device_position(angles));

    posEE.set(device_to_graphics(positions));
    convPosEE = posEE.clone();


    if (guidance) {
      posEE.set(device_to_graphics(posEE));

      // depending on the type of entity to trace
      switch (haplyType) {
        case Type.SEGMENT: {
          if (segments.length != 0) {
            audioHapticContours(segments, 3000, 3000, 6); // prev: 15
          }
          break;
        }
        case Type.OBJECT: {
          if (objects.length != 0) {
            audioHapticContours(objects, 2000, 2000, 20);
          }
          break;
        }
        case Type.IDLE:
          break;
      }
    }

    prevPosEE.set(convPosEE.clone());

    // send required data back
    /**
     * positions: x/y position in 2DIY frame of reference
     * waitForInput: if we need to request input from the user
     * entityIndex: index of the entity needed to play audio
     * sendAudioSignal: signal to let main script know we're ready to play audio
     * haplyType: segment or object for drawing
     * segIndex: index of the current segment or object
     * subSegIndex: index of the current subsegment or object in a group
     */
    const data = {
      positions:
        { x: positions.x, y: positions.y},
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

// Spring constant.
let springConst = 200;

// Mode when controlled by the user.
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

// Let's us know if that the main script is done playing audio.
let doneWithAudio = false;

// To let main script know it's time to play audio.
let sendAudioSignal = false;

// TODO: rewrite all of this within a class
function audioHapticContours(segments: SubSegment[][], tSegDuration: number,
  tSubSegDuration: number, tSubSegPointDuration: number) {

  const t0 = tSegDuration;
  const t1 = tSubSegDuration;
  const t2 = tSubSegPointDuration;

  switch (mode) {

    case Mode.InitializeAudio: {
      // called when starting a segment or object experience
      // depending on the type, the starting audio index may vary
      // objHeaderIndex contains the index of the first object returned in the entities list
      entityIndex = haplyType == Type.SEGMENT ? 0 : objHeaderIndex - 1;
      mode = Mode.StartAudio;
    }

    case Mode.StartAudio: {
      // make sure we don't go beyond the max index
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
      }
      break;
    }
    case Mode.DoneAudio: {

      // reset flag
      doneWithAudio = false;

      // in case we need to play another audio segment right after one is finished
      // typically after static segments
      // otherwise get ready for the 2DIY
      let audioSeg = audioData[entityIndex];
      if (audioSeg.isStaticSegment) {
        mode = Mode.StartAudio;
      }
      else {
        mode = Mode.StartHaply;
      }

      // since we've finished an audio chunk, move on to the next one
      entityIndex++;
      break;
    }

    // grace 1.5s buffer before we actually begin
    case Mode.StartHaply: {
      tHoldTime = Date.now();
      mode = Mode.WaitHaply;
      break;
    }

    case Mode.WaitHaply: {
      if (Date.now() - tHoldTime > 1000) {
        mode = Mode.MoveHaply;
        tLastChangePoint = Date.now();
      }
      break;
    }
    case Mode.MoveHaply: {
      activeGuidance(segments, t0, t1, t2);
      break;
    }
    case Mode.Reset: {
      mode = Mode.InitializeAudio;
      return;
    }
  }
}

/**
 * Moves the Haply 2DIY in ascending order of segments/objects.
 * @param segments list of objects or segments to trace as SubSegments[]
 * @param tSegmentDuration Buffer time when moving from one segment to the next.
 * @param tSubSegmentDuration Buffer time when moving from one subsegment to the next.
 * @param tSubSegmentPointDuration Buffer time when moving from one point to the next in a subsegment.
 */
function activeGuidance(segments: SubSegment[][], tSegmentDuration: number,
  tSubSegmentDuration: number, tSubSegmentPointDuration: number) {

  // first check for breakout conditions by user
  if (breakKey != BreakKey.None) {
    fEE.set(0, 0); // reset forces

    // escape means we want to cancel any tracing
    if (breakKey == BreakKey.Escape) {
      finishTracing();
      haplyType = Type.IDLE;
      mode = Mode.Reset;
    }

    // the user skipped forward while on a haptic segment
    if (breakKey == BreakKey.NextHaptic) {
      finishSubSegment();
    }

    // the user skipped forward while on an audio segment
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
      // TODO: rewrite
      if (currentSegmentIndex == 0 && entityIndex <= 2) {
        entityIndex = 0;
        mode = Mode.StartAudio;
      }
      else {
        // go back one index
        currentSegmentIndex = currentSegmentIndex == 0 ? 0 : currentSegmentIndex - 1;

        // this will always be equivalent to the last subsegment to trace when coming from an audio segment
        currentSubSegmentIndex = segments[currentSegmentIndex].length - 1;
        entityIndex--;
        changeSubSegment();
      }
    }
    // reset after we've finished
    breakKey = BreakKey.None;
  }

  else {

    // if we have traced every index, then we are done with the current mode
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

      // check if the buffer time is over, then play audio
      if (Date.now() - tLastChangeSegment > tSegmentDuration) {
        mode = Mode.StartAudio;
        startNewSegment();
      }

      // if we are done with a subsegment ...
    } else if (curSubSegmentDone) {

      // check to see if this is the last subsegment in the list
      if (currentSubSegmentIndex != currentSegment.length) {
        // if not, move on to next subsegment
        // but make sure we're not waiting for input
        if (waitForInput) {
          guidance = false;
        }
        // we'll only start a new subsegment once the buffer time is over
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

        // if we are done tracing each point in this subsegment, end it
        if (currentSubSegmentPointIndex >= currentSubSegment.coordinates.length) {
          finishSubSegment();
        }
        tLastChangePoint = Date.now();
      } else {

        // move to end effector to the point
        const coord = currentSubSegment.coordinates[currentSubSegmentPointIndex];
        moveToPos(coord);
      }
    }
  }
}

/**
 * Called when we are done tracing all entities or want to cancel.
 */
function finishTracing() {
  currentSegmentIndex = 0;
  currentSubSegmentIndex = 0;
  curSegmentDone = false;
  mode = Mode.Reset;
}

/**
 * Switch between guidance modes.
 */
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

/**
 * Called when moving to the previous subsegment.
 */
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
/**
 * Called when starting a new segment.
 */
function startNewSegment() {
  curSegmentDone = false;
  waitForInput = false;
}

/**
 * Called when starting a new subsegment.
 */
function startNewSubSegment() {
  curSubSegmentDone = false;
  waitForInput = false;
  // reset the point to point time buffer
  tLastChangePoint = Date.now();
}

/**
 * Called as soon as we are done tracing a full segment.
 */
function finishSegment() {
  currentSegmentIndex++;
  currentSubSegmentIndex = 0;
  currentSubSegmentPointIndex = 0;
  curSegmentDone = true;
  curSubSegmentDone = false;
  waitForInput = true;
  fEE.set(0, 0);
}

/**
 * Called when we are done tracing a subsegment.
 */
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
  tLastChangeSubSegment = Date.now();
  fEE.set(0, 0);
}

/**
 * Moves the end-effector to the specified vector position.
 * @param vector Vector containing {x,y} position of the Haply coordinates.
 */
function moveToPos(vector: Vector) {

  // find the distance between our current position and target
  const targetPos = new Vector(vector.x, vector.y);
  const xDiff = targetPos.subtract(convPosEE.clone());

  // P controller
  const multiplier = xDiff.mag() > 0.01 ? ((14.377 * xDiff.mag()) + 1.8168) : 2
  const kx = xDiff.multiply(springConst).multiply(multiplier);

  // allow for higher tolerance when moving from the home position
  // apparently needs more force to move from there
  let constrainedMax = currentSegmentIndex == 0 && currentSubSegmentIndex == 0 ? 6 : 4

  // D controller
  const dx = (convPosEE.clone()).subtract(prevPosEE);
  const dt = 1 / 1000;
  const c = 1.8;
  const cdxdt = (dx.divide(dt)).multiply(c);

  // I controller
  const cumError = dx.add(dx.multiply(dt));
  const ki = 12;

  // set forces
  let fx = constrain(kx.x + cdxdt.x + ki * cumError.x, -1 * constrainedMax, constrainedMax);
  let fy = constrain(kx.y + cdxdt.y + ki * cumError.y, -1 * constrainedMax, constrainedMax);
  force.set(fx, fy);
  fEE.set(graphics_to_device(force));
}

/**
 * 
 * @param val Value to constrain.
 * @param min Minimum constrained value.
 * @param max Maximum constrained value.
 * @returns 
 */
function constrain(val: number, min: number, max: number) {
  return val > max ? max : val < min ? min : val;
}

/**
 * 
 * @param coords 2D array containing normalized x/y positions
 * @returns Vector of {x,y} corresponding to position on Haply 2DIY workspace.
 */
export function transformPtToWorkspace(coords: [number, number]): Vector {
  const x = (coords[0] * 0.1333) - 0.064;
  const y = (coords[1] * 0.0833) + 0.0368;
  return  new Vector(x, y);
}
