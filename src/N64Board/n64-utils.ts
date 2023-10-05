import { canvasCircle } from "../types/canvas-circle";
import { canvasRectangle } from "../types/canvas-rectangle";
import { ImageRendering } from "../types/response.schema";

import * as infoUtils from '../info/info-utils';
import * as worker from './worker';

import browser from "webextension-polyfill";
import { getAllStorageSyncData } from "../utils";
import { Vector } from "../hAPI/libraries/Vector";

// canvas dimensions for haptic rendering
const canvasWidth = 800;
const canvasHeight = 500;

let loc = new Vector(0, 0);
let pos = new Vector(0, 0);
let button: number;

const joystickSensitivity = 0.04;

enum ButtonStatus {
    NONE = 0,
    BUTTON_BLUE = 1,
    BUTTON_GREEN = 2,
    BUTTON_GRAY = 4,
    BUTTON_L = 8,
    BUTTON_R = 16
}

buttonStatus: ButtonStatus;

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
function updateAnimation(pos: Vector,
    endEffector: canvasCircle,
    border: canvasRectangle,
    drawingInfo: { haplyType: worker.Type, segIndex: number, subSegIndex: number },
    segments: worker.SubSegment[][], objects: worker.SubSegment[][],
    ctx: CanvasRenderingContext2D) {

    // drawing bounding boxes and centroids
    drawBoundaries(drawingInfo, segments, objects, ctx);
    border.draw();

    let joystickInputX = pos.x; /* Get joystick X value (-93 to 93) */
    let joystickInputY = -1 * pos.y; /* Get joystick Y value (-93 to 93) */

    // Calculate the new position based on joystick input
    loc.x += joystickInputX * joystickSensitivity;
    loc.y += joystickInputY * joystickSensitivity;


    // Ensure the circle stays within the canvas bounds
    loc.x = constrain(loc.x, 0, canvasWidth);
    loc.y = constrain(loc.y, 0, canvasHeight);

    switch (button) {
        case ButtonStatus.BUTTON_GRAY:
            endEffector.color = 'gray';
            break;
        case ButtonStatus.BUTTON_GREEN:
            endEffector.color = 'green';
            break;
        case ButtonStatus.BUTTON_BLUE:
            endEffector.color = 'blue';
            //snd.play();
            break;
        case ButtonStatus.NONE:
            endEffector.color = 'white';
            break;
    }

    endEffector.x = loc.x;
    endEffector.y = loc.y;
    endEffector.draw();
}

/**
 * Draw segment/object boundaries.
 * @param drawingInfo Info for segment/object to draw.
 * @param segments List of segments to draw.
 * @param objects List of objects to draw.
 * @param ctx 
 */
function drawBoundaries(drawingInfo: { haplyType: worker.Type, segIndex: number, subSegIndex: number },
    segments: worker.SubSegment[][], objects: worker.SubSegment[][],
    ctx: CanvasRenderingContext2D) {
    if (drawingInfo != undefined) {

        // subsegment and segment index
        const [i, j] = [drawingInfo['segIndex'], drawingInfo['subSegIndex']];
        ctx.lineWidth = 4;

        // segments
        if (drawingInfo['haplyType'] == 0) {
            ctx.strokeStyle = "blue";
            if (segments[i][j] != undefined) {
                segments[i][j].coordinates.forEach(coord => {
                    const pX = coord.x;
                    const pY = coord.y;
                    let [pointX, pointY] = imgToWorldFrame(pX, pY);
                    ctx.strokeRect(pointX, pointY, 1, 1);
                })
            }
        }

        // objects
        else if (drawingInfo['haplyType'] == 1) {
            ctx.strokeStyle = "orange";
            if (objects[i][j] != undefined) {
                objects[i][j].coordinates.forEach(coord => {
                    const pX = coord.x;
                    const pY = coord.y;
                    let [pointX, pointY] = imgToWorldFrame(pX, pY);

                    // bigger size for single point objects
                    const size = objects[i][j].coordinates.length == 1 ? 20 : 1
                    ctx.strokeRect(pointX, pointY, size, size);
                })
            }
        }
    }

}

/**
 * Converts 2DIY coordinates to Canvas frame of reference coords.
 * @param x1 x position in the normalized 0 -> 1 coordinate system
 * @param y1 y position in the normalized 0 -> 1 coordinate system
 * @returns Tuple containing the [x, y] position for the canvas
 */
function imgToWorldFrame(x1: number, y1: number): [number, number] {
    const x = x1 * canvasWidth;
    const y = y1 * canvasHeight;
    return [x, y]
}

/**
 * @param val incoming value to constrain
 * @param min minimum value of constrained range
 * @param max maximum value of constrained range
 * @returns Tuple containing the [x, y] position for the canvas
 */
function constrain(val: number, min: number, max: number) {
    return val > max ? max : val < min ? min : val;
}

/**
 * Returns a HTML canvas of specified properties.
 * @param contentDiv container for canvas.
 * @returns Canvas with context.
 */
function createCanvas(contentDiv: HTMLElement, width: number, height: number) {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.id = "main";
    canvas.width = width;
    canvas.height = height;
    canvas.style.zIndex = "8";
    canvas.style.position = "relative";
    canvas.style.border = "1px solid";
    contentDiv.append(document.createElement("br"));
    contentDiv.append(canvas);

    return canvas;
}

export async function processRendering(rendering: ImageRendering, graphic_url: string, container: HTMLElement, contentId: string) {
    let endEffector: canvasCircle;
    let border: canvasRectangle;
    // end effector x/y coordinates
    let posEE: Vector;
    let deviceOrigin: Vector;

    // virtual end effector avatar offset
    let firstCall: boolean = true;

    const data = rendering["data"]["info"] as any;

    const audioCtx = new window.AudioContext();

    const audioBuffer = await fetch(data["audioFile"] as string).then(resp => {

        return resp.arrayBuffer();
    }).then(buffer => {
        return audioCtx.decodeAudioData(buffer);
    }).catch(e => { console.error(e); throw e; });


    let div = document.createElement("div");
    div.classList.add("row");
    container.append(div);
    let contentDiv = document.createElement("div");
    contentDiv.classList.add("collapse");
    contentDiv.classList.add("rendering-content");

    contentDiv.id = contentId;
    div.append(contentDiv);

    // adding buttons
    let btn = infoUtils.createButton(contentDiv, "btn", "Connect to N64 Controller");

    // creating canvas
    const canvas = createCanvas(contentDiv, canvasWidth, canvasHeight);

    if (rendering["metadata"] && rendering["metadata"]["homepage"]) {
        infoUtils.addRenderingExplanation(contentDiv, rendering["metadata"]["homepage"])
    }
    const res = canvas.getContext('2d');
    if (!res || !(res instanceof CanvasRenderingContext2D)) {
        throw new Error('Failed to get 2D context');
    }
    const ctx: CanvasRenderingContext2D = res;

    const img = new Image();
    img.src = graphic_url;

    // world resolution properties
    //worldPixelWidth = 800;

    // posEE = {
    //     x: 0,
    //     y: 0
    // };

    // // initial position of end effector avatar
    // deviceOrigin = {
    //     x: worldPixelWidth / 2,
    //     y: 0
    // };

    border = {
        draw: function () {
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }
    };

    // draw end effector
    endEffector = {
        x: canvas.width / 2,
        y: 0,
        vx: 5,
        vy: 2,
        radius: 8,
        color: 'brown',
        draw: function () {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    };

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log("in draw");
        updateAnimation(pos, endEffector, border, drawingInfo, segments, objects, ctx);
        window.requestAnimationFrame(draw);
    }

    // define segments and objects
    let segments: worker.SubSegment[][];
    let objects: worker.SubSegment[][];
    let drawingInfo: { haplyType: worker.Type, segIndex: number, subSegIndex: number };

    // Audio Modes
    const enum AudioMode {
        Play,
        Finished,
        Idle,
    }

    const worker = new Worker(browser.runtime.getURL("./N64Board/worker.js"), { type: "module" });

    // event listener for serial comm button
    btn.addEventListener("click", async _ => {

        let n64port = await navigator.serial.requestPort();
        console.log("incoming", data);

        // send all the rendering info
        worker.postMessage({
            renderingData: data
        });


        worker.addEventListener("message", function (msg) {
            console.log("in the worker");
            // we've selected the COM port
            btn.style.visibility = 'hidden';

            const msgdata = msg.data;
            pos.x = msgdata.packet[0];
            pos.y = msgdata.packet[1];
            button = msgdata.packet[2];

            console.log(pos);

            // only request to run draw() once
            if (firstCall) {
                //console.log("first call?");
                //if (msgdata.segmentData != undefined ||
                //   msgdata.objectData != undefined) {
                window.requestAnimationFrame(draw);
                firstCall = false;
                //}
            }
        });
    });

    // Stop the current audio segment from progressing.
    // function stopAudioNode() {
    //     sourceNode.stop();
    //     audioData.mode = AudioMode.Finished;
    // }
}
