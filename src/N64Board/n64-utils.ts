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

let segmentIndex = 0;


let segs: any[] = [];
let objs: any[] = [];

const joystickSensitivity = 0.04;

enum ButtonStatus {
    NONE = 0,
    BUTTON_BLUE = 1,
    BUTTON_GREEN = 2,
    BUTTON_GRAY = 4,
    BUTTON_START = 8,
    BUTTON_L = 16,
    BUTTON_R = 32
}

buttonStatus: ButtonStatus;

let canClick = true;

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
    ctx: CanvasRenderingContext2D) {

    // drawing bounding boxes and centroids
    drawBoundaries(segs, segmentIndex, ctx);
    border.draw();

    let joystickInputX = pos.x; /* Get joystick X value (-93 to 93) */
    let joystickInputY = -1 * pos.y; /* Get joystick Y value (-93 to 93) */

    // Calculate the new position based on joystick input
    loc.x += joystickInputX * joystickSensitivity;
    loc.y += joystickInputY * joystickSensitivity;


    // Ensure the circle stays within the canvas bounds
    loc.x = constrain(loc.x, 0, canvasWidth);
    loc.y = constrain(loc.y, 0, canvasHeight);

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
function drawBoundaries(segments: any, segmentIndex: number,
    ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "blue";

    if (segments[segmentIndex].contours[0].length > 0) {
        segments[segmentIndex].contours[0].forEach((contour: { coordinates: any[]; }) => {
            contour.coordinates.forEach((coord: any[]) => {
                const pX = coord[0];
                const pY = coord[1];
                let [pointX, pointY] = imgToWorldFrame(pX, pY);
                ctx.strokeRect(pointX, pointY, 1, 1);
            });
        });
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

    // virtual end effector avatar offset
    let firstCall: boolean = true;

    const data = rendering["data"]["info"] as any;
    console.log(data);
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

    let currentOffset: number | undefined;
    let currentDuration: number | undefined;
    let sourceNode: AudioBufferSourceNode | undefined;
    let currentAudioIndex: number = -2;

    function playPauseAudio(index: number, segmentOffset: number, segmentDuration: number) {
        if (index == currentAudioIndex && sourceNode) {
            /** Do not create a new audio context, just pause/play the current audio*/
            (sourceNode.playbackRate.value == 0) ? (sourceNode.playbackRate.value = 1) : (sourceNode.playbackRate.value = 0);
            currentAudioIndex = index;
        }
        else {
            if (sourceNode) {
                sourceNode.stop();
            }
            setTimeout(function () {
                sourceNode = audioCtx.createBufferSource();
                sourceNode.addEventListener("ended", () => { sourceNode = undefined; });
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioCtx.destination);
                sourceNode.start(0, segmentOffset, segmentDuration);
            }, 20);
        }
    }

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
        updateAnimation(pos, endEffector, border, ctx);
        window.requestAnimationFrame(draw);
    }

    const worker = new Worker(browser.runtime.getURL("./N64Board/worker.js"), { type: "module" });

    // event listener for serial comm button
    btn.addEventListener("click", async _ => {

        let n64port = await navigator.serial.requestPort();
        console.log("incoming", data);

        getSegmentsFromData(data);

        // send all the rendering info
        worker.postMessage({
            renderingData: data
        });

        worker.addEventListener("message", function (msg) {
            // we've selected the COM port
            btn.style.visibility = 'hidden';

            const msgdata = msg.data;
            pos.x = msgdata.packet[0];
            pos.y = msgdata.packet[1];
            button = msgdata.packet[2];

            // only request to run draw() once
            if (firstCall) {
                window.requestAnimationFrame(draw);
                firstCall = false;
            }

            // handle audio/button events here
            switch (button) {
                case ButtonStatus.BUTTON_START:
                    endEffector.color = 'red';
                    // fix playback issue
                    runFunc(playPauseAudio(segmentIndex, segs[segmentIndex].offset, segs[segmentIndex].duration));
                    break;
                case ButtonStatus.BUTTON_GRAY:
                    endEffector.color = 'gray';
                    break;
                case ButtonStatus.BUTTON_GREEN:
                    endEffector.color = 'green';
                    runFunc(cycleSegment);
                    break;
                case ButtonStatus.BUTTON_BLUE:
                    endEffector.color = 'blue';
                    //snd.play();
                    break;
                case ButtonStatus.NONE:
                    endEffector.color = 'white';
                    break;
            }

            isInSegment(pos);

        });
    });

    // Stop the current audio segment from progressing.
    // function stopAudioNode() {
    //     sourceNode.stop();
    //     audioData.mode = AudioMode.Finished;
    // }
}

function getSegmentsFromData(data: any) {

    let entities = data["entities"];
    entities.forEach((entity: any) => {
        if (entity.entityType === 'segment') {
            segs.push(entity);
        } else if (entity.entityType === 'object') {
            objs.push(entity);
        }
    });
}

// prevent double taps
function runFunc(func: any) {
    if (canClick) {
        // handling the clcik
        //segmentIndex = segmentIndex >= (segs.length - 1) ? 0 : segmentIndex + 1;
        func();

        // disable further clicks for a brief period
        canClick = false;

        // set a timeout to re-enable clicking after delay
        setTimeout(() => {
            canClick = true;
        }, 1000);
    }

}

function cycleSegment() {
    segmentIndex = segmentIndex >= (segs.length - 1) ? 0 : segmentIndex + 1;
}

function isInSegment(pos: Vector) {
    let normalizedX = pos.x / canvasWidth;
    let normaliedY = pos.y / canvasHeight;
}

