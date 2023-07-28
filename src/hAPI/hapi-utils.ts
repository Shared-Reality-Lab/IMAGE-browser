import { canvasCircle } from "../types/canvas-circle";
import { canvasRectangle } from "../types/canvas-rectangle";
import { ImageRendering } from "../types/response.schema";
import { Vector } from "../types/vector";

import * as infoUtils from '../info/info-utils';
import * as worker from './worker';


import browser from "webextension-polyfill";
import { BreakKey } from "./worker";
import { getAllStorageSyncData } from "../utils";

// canvas dimensions for haptic rendering
const canvasWidth = 800;
const canvasHeight = 500;

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
function updateAnimation(posEE: Vector,
    endEffector: canvasCircle,
    deviceOrigin: Vector,
    border: canvasRectangle,
    drawingInfo: { haplyType: worker.Type, segIndex: number, subSegIndex: number },
    segments: worker.SubSegment[][], objects: worker.SubSegment[][],
    ctx: CanvasRenderingContext2D) {

    // drawing bounding boxes and centroids
    drawBoundaries(drawingInfo, segments, objects, ctx);
    border.draw();

    //scaling end effector position to canvas
    let xE = pixelsPerMeter * (-posEE.x + 0.014);
    let yE = pixelsPerMeter * ((posEE.y / 0.805) - 0.0311);

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

export async function processHapticsRendering(rendering: ImageRendering, graphic_url: string, container: HTMLElement, contentId : string){
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
    let btn = infoUtils.createButton(contentDiv, "btn", "Connect to Haply");
    let btnStart = infoUtils.createButton(contentDiv, "btnStart", "Start");
    let btnEscape = infoUtils.createButton(contentDiv, "btnEscape", "Stop");
    let btnNext = infoUtils.createButton(contentDiv, "btnNext", "Next");
    let btnPrev = infoUtils.createButton(contentDiv, "btnPrev", "Previous");

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
    const worldPixelWidth = 800;

    posEE = {
        x: 0,
        y: 0
    };

    // initial position of end effector avatar
    deviceOrigin = {
        x: worldPixelWidth / 2,
        y: 0
    };

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
        updateAnimation(posEE, endEffector, deviceOrigin, border, drawingInfo, segments, objects, ctx);
        window.requestAnimationFrame(draw);
    }

    // define segments and objects
    let segments: worker.SubSegment[][];
    let objects: worker.SubSegment[][];
    let drawingInfo: { haplyType: worker.Type, segIndex: number, subSegIndex: number };
    // when haply needs to move to a next segment
    let waitForInput: boolean = false;
    // when user presses a key to break out of the current haply segment
    let breakKey: null | BreakKey;

    // Audio Modes
    const enum AudioMode {
        Play,
        Finished,
        Idle,
    }

    // Keep track of the mode and entity index so we know which file to play
    let audioData: { entityIndex: number, mode: null | AudioMode } = {
        entityIndex: 0,
        mode: null
    };

    // time to wait before audio segment is considered finished
    let tAudioBegin: number;
    // true when playing an audio segment
    let playingAudio = false;

    const worker = new Worker(browser.runtime.getURL("./hAPI/worker.js"), { type: "module"});

    // Play an audio segment with a given offset and duration.
    let sourceNode: AudioBufferSourceNode;
    function playAudioSeg(audioBuffer: any, offset: number, duration: number) {
        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioCtx.destination);
        sourceNode.start(0, offset, duration);
    }

    // Start
    btnStart.addEventListener("click", async _ => {
        let items = await getAllStorageSyncData();
        worker.postMessage({
            start: true,
            haply2diy2gen: items["haply2diy2gen"]
        });
    })

    // Stop
    btnEscape.addEventListener("click", _ => {
        sourceNode.stop();
        breakKey = BreakKey.Escape;
        worker.postMessage({
            waitForInput: waitForInput,
            breakKey: breakKey,
            tKeyPressTime: Date.now()
        });
    })

    // Next
    btnNext.addEventListener("click", _ => {
        if (audioData.mode == AudioMode.Play) {
            stopAudioNode();
            breakKey = BreakKey.NextFromAudio;
        }
        else {
            breakKey = BreakKey.NextHaptic;
        }
        worker.postMessage({
            waitForInput: waitForInput,
            breakKey: breakKey,
            tKeyPressTime: Date.now()
        });

    });

    // Prev
    btnPrev.addEventListener("click", _ => {
        if (audioData.mode == AudioMode.Play) {
            stopAudioNode();
            breakKey = BreakKey.PreviousFromAudio;
        }
        else {
            breakKey = BreakKey.PreviousHaptic;
        }
        worker.postMessage({
            waitForInput: waitForInput,
            breakKey: breakKey,
            tKeyPressTime: Date.now()
        });
    });

    // event listener for serial comm button
    btn.addEventListener("click", async _ => {
        // const worker = new Worker(browser.runtime.getURL("./info/worker.js"), { type: "module" });

        // only show the Arduino Zero
        const filters = [
            { usbVendorId: 0x2341, usbProductId: 0x804D }
        ];

        let hapticPort = await navigator.serial.requestPort({filters});

        // send all the rendering info
        worker.postMessage({
            renderingData: data
        });


        worker.addEventListener("message", function (msg) {
            // we've selected the COM port
            btn.style.visibility = 'hidden';

            const msgdata = msg.data;

            // return end-effector x/y positions and objectData for updating the canvas

            posEE.x = msgdata.positions.x;
            posEE.y = msgdata.positions.y;

            waitForInput = msgdata.waitForInput;

            // grab segment data if available
            if (msgdata.segmentData != undefined)
                segments = msgdata.segmentData;

            // grab object data if available
            if (msgdata.objectData != undefined)
                objects = msgdata.objectData;

            // grab drawing info if available
            if (msgdata.drawingInfo != undefined)
                drawingInfo = msgdata.drawingInfo;

            // only request to run draw() once
            if (firstCall) {
                if (msgdata.segmentData != undefined ||
                    msgdata.objectData != undefined) {
                    window.requestAnimationFrame(draw);
                    firstCall = false;
                }
            }

            // see if the worker wants us to play any audio
            if (msgdata.audioInfo != undefined && msgdata.audioInfo.sendAudioSignal) {
                audioData.entityIndex = msgdata.audioInfo.entityIndex;
                audioData.mode = AudioMode.Play;
                worker.postMessage({
                    receivedAudioSignal: true
                })
            }

            switch (audioData.mode) {
                case AudioMode.Play: {
                    // prevent audio from playing multiple times
                    if (!playingAudio) {
                        playingAudio = true;
                        playAudioSeg(audioBuffer,
                            data["entities"][audioData.entityIndex]["offset"],
                            data["entities"][audioData.entityIndex]["duration"]);
                        tAudioBegin = Date.now();
                    }

                    // wait for the audio segment to finish
                    if (Date.now() - tAudioBegin > 1000 * (0.5 + data["entities"][audioData.entityIndex]["duration"])) {
                        audioData.mode = AudioMode.Finished;
                    }
                    break;
                }
                // we've finished playing the audio segment
                case AudioMode.Finished: {
                    playingAudio = false;
                    worker.postMessage({
                        doneWithAudio: true
                    });
                    audioData.mode = AudioMode.Idle;
                }
                case AudioMode.Idle:
                    break;
            }
        });
    });

    // Stop the current audio segment from progressing.
    function stopAudioNode() {
        sourceNode.stop();
        audioData.mode = AudioMode.Finished;
    }
}
