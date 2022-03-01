import { Vector } from "../types/vector";
import * as worker from './worker';

export function createButton(contentDiv: HTMLElement, id: string, text: string ){
    let btn = document.createElement("button");
    btn.id = id;
    btn.innerHTML = text;
    contentDiv.append(btn);
    return btn;
}

/**
 * Returns a HTML canvas of specified properties.
 * @param contentDiv container for canvas.
 * @returns Canvas with context.
 */
export function createCanvas(contentDiv: HTMLElement){
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.id = "main";
    canvas.width = 800;
    canvas.height = 500;
    canvas.style.zIndex = "8";
    canvas.style.position = "relative";
    canvas.style.border = "1px solid";
    contentDiv.append(document.createElement("br"));
    contentDiv.append(canvas);

    const res = canvas.getContext('2d');
    if (!res || !(res instanceof CanvasRenderingContext2D)) {
        throw new Error('Failed to get 2D context');
    }
    const ctx: CanvasRenderingContext2D = res;
    return [canvas, res, ctx];
}


const pixelsPerMeter = 6000;

/**
 * Updates the canvas at each timeframe.
 * @param posEE The 2DIY workspace position.
 * @param endEffector Virtual avatar position.
 * @param deviceOrigin Starting coordinates of the 2DIY.
 * @param border Canvas border.
 * @param drawingInfo Info for segment/object to draw.
 * @param segments List of segments to draw.
 * @param objects List of objects to draw.
 * @param ctx Canvas context.
 */
export function updateAnimation(posEE: Vector, 
    endEffector: canvasCircle, 
    deviceOrigin: Vector, 
    border: canvasRectangle, 
    drawingInfo: [worker.Type, number, number], 
    segments: worker.SubSegment[][],objects:worker.SubSegment[][], 
    ctx: CanvasRenderingContext2D) {

    // drawing bounding boxes and centroids
    drawBoundaries(drawingInfo, segments,objects, ctx);
    border.draw();

    //scaling end effector position to canvas
    let xE = pixelsPerMeter * -posEE.x;
    let yE = pixelsPerMeter * posEE.y;


    // set position of virtual avatar in canvas
    endEffector.x = deviceOrigin.x + xE - 100;
    endEffector.y = deviceOrigin.y + yE - 167;
    endEffector.draw();
}

/**
 * Draw segment/object boundaries.
 * @param drawingInfo Info for segment/object to draw.
 * @param segments List of segments to draw.
 * @param objects List of objects to draw.
 * @param ctx 
 */
 export function drawBoundaries(drawingInfo: [worker.Type, number, number], segments:worker.SubSegment[][],objects:worker.SubSegment[][], ctx:CanvasRenderingContext2D){
    if (drawingInfo != undefined) {
        const [i, j] = [drawingInfo['segIndex'], drawingInfo['subSegIndex']];//currentHaplyIndex;
        if (drawingInfo['haplyType'] == 0) {
            segments[i][j].coordinates.forEach(coord => {
                const pX = coord[0];
                const pY = coord[1];
                let [pointX, pointY] = imgToWorldFrame(pX, pY);
                ctx.strokeRect(pointX, pointY, 1, 1);
            })
        }
        else {
            objects[i][j].coordinates.forEach(coord => {
                const pX = coord.x;
                const pY = coord.y;
                let [pointX, pointY] = imgToWorldFrame(pX, pY);
                ctx.strokeRect(pointX, pointY, 1, 1);
            })
        }
    }

}

const canvasWidth = 800;
const canvasHeight = 500;
/**
 * Converts 2DIY coordinates to Canvas frame of reference coords.
 * @param x1 x position in the normalized 0 -> 1 coordinate system
 * @param y1 y position in the normalized 0 -> 1 coordinate system
 * @returns Tuple containing the [x, y] position for the canvas
 */
export function imgToWorldFrame(x1: number, y1: number): [number, number] {
    const x = x1 * canvasWidth;
    const y = y1 * canvasHeight;
    return [x, y]
}