
import { Vector } from "../hAPI/libraries/vector.js";

import { convexhull } from './convex-hull.ts';

/************************ TYPE DECLARATIONS ******************************/
export type SubSegment = {
  coordinates: Vector[],
  bounds?: [number, number, number, number]
}

/************************ COORDINATE TRASFORMATION FUNCTIONS ******************************/

export function mapCoords(coordinates: [number, number][]): Vector[] {
  coordinates = coordinates.map(x => transformPtToWorkspace(x));
  return coordinates;
}

export function transformPtToWorkspace(coords: [number, number]): Vector {
  const x = (coords[0] * 0.1333) - 0.05;
  const y = (coords[1] * 0.0833) + 0.0278;
  return { x, y };
}


export function arrayToVector(coordinates: [number, number][]): Vector[] {
  coordinates = coordinates.map(a => transformToVector(a));
  return coordinates;
}

export function transformToVector(coords: [number, number]): Vector {
  const x = (coords[0]);
  const y = (coords[1]);
  return { x, y };
}

export function device_to_graphics(deviceFrame: any) {
  return new Vector(-deviceFrame[0], deviceFrame[1]);
}

export function graphics_to_device(graphicsFrame: any) {
  return graphicsFrame.set(-graphicsFrame.x, graphicsFrame.y);
}

export function imageToHaply(vec: Vector) {
  var x = (vec.x - 0.5) / 5.0;
  var y = (vec.y + 0.2) / 8.0;

  return new Vector(x, y);
}

export function constrain(val: number, min: number, max: number) {
  return val > max ? max : val < min ? min : val;
}


/* FUNCTIONS TO CREATE SEGMENTS AND OBJECTS */
export function createSegs(segmentInfo: any): SubSegment[][] {
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

export function createObjs(objectData: any): SubSegment[][] {
  let data: SubSegment[][] = [];
  let j = 0;
  for (const obj of objectData) {
    const object: Array<SubSegment> = [];
    //const objCentroids = objs.centroid[0];
    // seg -> coords -> (0 or 1 with diff areas/centroid/coords)
    // each part of the segment
    if (obj.centroid.length == 1) {
      // console.log("not group!");
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
      // console.log("group");
      // const objCoords: Vector[] = obj.centroid;
      const hull: Vector[] = [];
      // console.log("the hull array in funciton: ", obj.hull);
      // for (const coord in obj.hull){
      //   console.log("the hull coordinate: ", coord);
      //   let temp = new Vector(coord[0], coord[1]);
      //   hull.push(temp);
      // }
      for (let k =0; k<obj.hull.length; k++){
        let temp = new Vector(obj.hull[k][0],obj.hull[k][1]);
        // console.log("the coordinate vector: ", temp);
        hull.push(temp);
      }
      // const hull: Vector[] = obj.hull;
      // console.log("the hull: ", hull);
      const coordinates: Vector[] = upsample(hull);
      // console.log("the hull coordinates: ", coordinates);
      object[0] = { coordinates };
    }
    data.push(object);
  }
  j++;
  return data;
}

/*FORCE CALCULATION FUNCTIONS */
export function forceToMov(convPosEE:Vector, vector: Vector, springConst: number) {

  let force = new Vector(0, 0);
  
  const targetPos = new Vector(vector.x, vector.y);
  const xDiff = targetPos.subtract(convPosEE.clone());
  //const multiplier = (xDiff.mag()) < threshold ? (xDiff.mag() / threshold) : 1;

  const multiplier = xDiff.mag() > 0.01 ? 2 : 2;


  const kx = xDiff.multiply(200).multiply(multiplier);

  const fx = constrain(kx.x, -3, 3);
  const fy = constrain(kx.y, -3, 3);
  force.set(fx, fy);
  // console.log(force);
  return graphics_to_device(force);
  // fEE.set(utils.graphics_to_device(force));
}



/*OTHER FUNCTIONS */
export function upsample(pointArray: Vector[]) {
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

  //checks to see if the end effector is inside a specified shape (currently only checks for rectanlges)
export function inShape(coords: any, ee_pos: any) {
  if ((ee_pos.x >= coords[0] && ee_pos.x <= coords[2]) && (ee_pos.y >= coords[1] && ee_pos.y <= coords[3])) {
    return true;
  }
  else {
    return false;
  }
}