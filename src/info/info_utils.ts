import { vector } from "../types/vector";
import * as worker from './worker';


export function createButton(contentDiv:HTMLElement, id:string, text:string ){
    let btn = document.createElement("button");
    btn.id = id;
    btn.innerHTML = text;
    contentDiv.append(btn);
    return btn;

}

export function createCanvas(contentDiv:HTMLElement){
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
    return [canvas,res,ctx];
}


const worldPixelWidth = 800;
const pixelsPerMeter = 6000;

export function updateAnimation(posEE:vector,endEffector:canvasCircle, deviceOrigin:vector, border: canvasRectangle,drawingInfo: [worker.Type, number, number], segments:worker.SubSegment[][],objects:worker.SubSegment[][], ctx:CanvasRenderingContext2D) {

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

export function drawBoundaries(drawingInfo: [worker.Type, number, number], segments:worker.SubSegment[][],objects:worker.SubSegment[][], ctx:CanvasRenderingContext2D){
    if (drawingInfo != undefined) {
        const [i, j] = [drawingInfo['segIndex'], drawingInfo['subSegIndex'];//currentHaplyIndex;
        if (drawingInfo['haplyType'] == 0) {
            segments[i][j].coordinates.forEach((coord: any) => {
                const pX = coord[0];
                const pY = coord[1];
                let [pointX, pointY] = imgToWorldFrame(pX, pY);
                ctx.strokeRect(pointX, pointY, 1, 1);
            })
        }
        else {
            objects[i][j].coordinates.forEach((coord: any) => {
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

export function imgToWorldFrame(x1: number, y1: number): [number, number] {
    //const x = ((x1 + 0.0537) / 0.1345) * canvasWidth;
    //const y = ((y1 - 0.0284) / 0.0834) * canvasHeight;
    const x = x1 * canvasWidth;
    const y = y1 * canvasHeight;
    return [x, y]
}