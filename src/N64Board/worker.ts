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

import { N64Board } from "./N64Board"
import { Vector } from "../hAPI/libraries/Vector"
import { Board } from "../hAPI/libraries/Board";
import { Device } from "../hAPI/libraries/Device";
import { PantographV3 } from '../hAPI/libraries/PantographV3';
import { Pantograph } from "../hAPI/libraries/Pantograph";
import { convexhull } from '../hAPI/convex-hull';

// TODO: set object types

// set to false if using old 2DIY
let usePantographV3 = true;

// declaration of haply specific variables
const widgetOneID = 5;
let widgetOne: any;
let pantograph;
let haplyBoard;
let messageCount: number = 0;

// store required handler json
let baseObjectData: Array<any> = [];
let objectData: Array<any> = []
let segmentData: Array<any> = [];
let baseSegmentData: Array<any> = [];
let audioData: Array<any> = [];

// end-effector x/y coords
let pos = new Vector(0, 0);
let prevPos = new Vector(0.5, 0);

// transformed end-effector coordinates
let convPosEE = new Vector(0, 0);

// Index for where objects begin.
let objHeaderIndex: number = 0;

export const enum Type {
  SEGMENT,
  OBJECT,
  IDLE
}

export type SubSegment = {
  coordinates: Vector[],
  bounds?: [number, number, number, number]
}

let segments: SubSegment[][] = [];
let objects: SubSegment[][] = [];

self.addEventListener("message", async function (event) {

  // Read object, segment, and audio data.
  if (event.data.renderingData != undefined) {

    let rendering = event.data.renderingData.entities;
    // index marking object start location
    objHeaderIndex = rendering.findIndex((x: { entityType: string }) => x.entityType == "object")

    for (let i = 0; i < rendering.length; i++) {

      // find objects
      // keep the base object data for sending to main script for renderign
      // but also keep object data for 2DIY
      // if (rendering[i].entityType == "object") {
      //   const name = rendering[i].name;
      //   const centroid = rendering[i].centroid.map((x: any) => transformToVector(x));
      //   const coords = rendering[i].contours;
      //   const tCentroid = rendering[i].centroid.map((x: any) => transformPtToWorkspace(x))

      //   let baseObj = {
      //     name: name,
      //     centroid: centroid,
      //     coords: coords
      //   }

      //   let tObj = {
      //     name: name,
      //     centroid: tCentroid,
      //     coords: coords
      //   }

      //   baseObjectData.push(baseObj);
      //   objectData.push(tObj);
      // }

      // find segments and map them to 2DIY workspace
      // if (rendering[i].entityType == "segment") {
      //   const coords = rendering[i].contours.map((y: any) => y.map((x: any) => mapCoordsToVec(x.coordinates)));
      //   const tCoords = rendering[i].contours.map((y: any) => y.map((x: any) => mapCoords(x.coordinates)));
      //   let baseSeg = { coords: coords }
      //   let tSeg = { coords: tCoords }
      //   baseSegmentData.push(baseSeg);
      //   segmentData.push(tSeg);
      // }

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

    // objects = createObjs(objectData);
    // segments = createSegs(segmentData);

    this.self.postMessage({
      peekaboo: "peekaboo"
    });
    //   positions: { x: positions.x, y: positions.y },
    //   objectData: createObjs(baseObjectData),
    //   segmentData: createSegs(baseSegmentData),
    // });
  }

  /************ BEGIN SETUP CODE *****************/
  if (messageCount < 1) {
    messageCount++;
    haplyBoard = new Board();
    await haplyBoard.init();
  }

  /************************ END SETUP CODE ************************* */

  /**********  BEGIN CONTROL LOOP CODE *********************/

  while (true) {

    prevPos.set(convPosEE.clone());

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
    // const data = {
    // }

    // // sending end effector position back to info.ts to update visuals
    // this.self.postMessage(data);

    await new Promise(r => setTimeout(r, 1));
  }

  /**********  END CONTROL LOOP CODE *********************/
});