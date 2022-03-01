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
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import Plyr from "plyr";
import "./info.scss";
import browser from "webextension-polyfill";
import { v4 as uuidv4 } from 'uuid';
import { IMAGEResponse } from "../types/response.schema";
import { Vector } from '../types/vector';
import { canvasCircle } from '../types/canvas-circle';
import { canvasRectangle } from '../types/canvas-rectangle';
import * as worker from './worker';
import { BreakKey } from './worker';

let request_uuid = window.location.search.substring(1);
let renderings: IMAGEResponse;
let port = browser.runtime.connect();

// canvas dimensions for haptic rendering
const canvasWidth = 800;
const canvasHeight = 500;

const audioCtx = new window.AudioContext();

port.onMessage.addListener(async (message) => {
    if (message) {
        renderings = message;
    } else {
        renderings = { "request_uuid": request_uuid, "timestamp": 0, "renderings": [] };
    }

    console.log(renderings);

    // Update renderings label
    let title = document.getElementById("renderingTitle");
    if (title) {
        title.textContent = browser.i18n.getMessage("renderingTitle");
    }

    let label = browser.i18n.getMessage("renderingLabel");

    let count = 1;
    for (let rendering of renderings["renderings"]) {
        let container = document.createElement("section");
        container.classList.add("container");
        container.classList.add("rendering");
        let labelButton = document.createElement("button");
        let contentId = "m-" + uuidv4();
        labelButton.classList.add("btn", "btn-primary");
        labelButton.setAttribute("type", "button");
        labelButton.setAttribute("data-bs-toggle", "collapse");
        labelButton.setAttribute("data-bs-target", "#" + contentId);
        labelButton.setAttribute("aria-expanded", "false");
        labelButton.setAttribute("aria-controls", contentId);
        labelButton.textContent = label + " " + count + ": " + rendering["description"];
        container.append(labelButton);

        if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.Text") {
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);
            const text = rendering["data"]["text"] as string;
            const p = document.createElement("p");
            p.textContent = text;
            contentDiv.append(p);
        }
        else if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.SimpleAudio") {
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);
            const audio = document.createElement("audio");
            audio.setAttribute("controls", "");
            audio.setAttribute("src", rendering["data"]["audio"] as string);
            contentDiv.append(audio);
            const download = document.createElement("a");
            download.setAttribute("href", rendering["data"]["audio"] as string);
            download.setAttribute("download", "rendering-" + count + "-" + request_uuid);
            download.textContent = "Download Audio File";
            contentDiv.append(download);
        }
        else if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.SegmentAudio") {
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);
            const selectDiv = document.createElement("div");
            selectDiv.classList.add("form-floating");
            contentDiv.append(selectDiv);
            const label = document.createElement("label");
            label.textContent = browser.i18n.getMessage("segmentAudioSelLabel");
            label.classList.add("form-label");
            const select = document.createElement("select");
            select.classList.add("form-select");
            select.setAttribute("id", "m-" + uuidv4());
            label.setAttribute("for", select.id);
            const fullOption = document.createElement("option");
            fullOption.setAttribute("value", "full");
            fullOption.setAttribute("selected", "true");
            fullOption.textContent = browser.i18n.getMessage("segmentAudioFullRendering");
            select.append(fullOption);
            const audioInfo = rendering["data"]["audioInfo"] as { "name": string, "offset": number, "duration": number }[];
            for (let idx = 0; idx < audioInfo.length; idx++) {
                const opt = document.createElement("option");
                opt.setAttribute("value", idx.toString());
                const val = audioInfo[idx];
                opt.textContent = val["name"];
                select.append(opt);
            }
            selectDiv.append(select);
            selectDiv.append(label);

            const button = document.createElement("button");
            button.textContent = browser.i18n.getMessage("segmentAudioButton");
            button.classList.add("btn", "btn-secondary");
            selectDiv.append(button);

            const audioBuffer = await fetch(rendering["data"]["audioFile"] as string).then(resp => {
                return resp.arrayBuffer();
            }).then(buffer => {
                return audioCtx.decodeAudioData(buffer);
            }).catch(e => { console.error(e); throw e; });

            let currentOffset: number | undefined;
            let currentDuration: number | undefined;

            select.addEventListener("input", (e) => {
                const evt = e as InputEvent;
                const target = evt.target as HTMLSelectElement;
                if (target.value === "full") {
                    currentOffset = undefined;
                    currentDuration = undefined;
                } else {
                    const idx = parseInt(target.value);
                    const data = audioInfo[idx];
                    currentOffset = data["offset"] as number;
                    currentDuration = data["duration"] as number;
                }
            });
            button.addEventListener("click", _ => {
                const sourceNode = audioCtx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioCtx.destination);
                sourceNode.start(0, currentOffset, currentDuration);
            });
        }

        if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.PhotoAudioHaptics") {

            let endEffector: canvasCircle;
            let border: canvasRectangle;

            // end effector x/y coordinates
            let posEE: Vector;
            // transformed canvas coordinates
            let xE: number
            let yE: number;
            let deviceOrigin: Vector;
            // virtual end effector avatar offset
            const offset = 150;
            let objectData: any;
            let segmentData: any;
            let firstCall: boolean = true;

            // get data from the handler
            const imageSrc = "https://raw.githubusercontent.com/Shared-Reality-Lab/auditory-haptics-graphics-DotPad/main/preprocessor_JSON/photos/1_outdoor_cycling_scene/outdoor_cycling_scene.jpg?token=GHSAT0AAAAAABLKCO6OO6OCBNKRQV4WL4HUYQ772HA";//"https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Canyon_no_Lago_de_Furnas.jpg/800px-Canyon_no_Lago_de_Furnas.jpg";
            const data = rendering["data"]["info"] as Array<JSON>;

            const audioBuffer = await fetch(data["audioFile"] as string).then(resp => {
                return resp.arrayBuffer();
            }).then(buffer => {
                return audioCtx.decodeAudioData(buffer);
            }).catch(e => { console.error(e); throw e; });

            console.log(data);

            // add rendering button
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");

            contentDiv.id = contentId;
            div.append(contentDiv);

            let options = ["Passive",
                "Active",
                "Vibration"];

            //Create and append select list
            const selectList = document.createElement("select");
            selectList.id = "mySelect";
            contentDiv.appendChild(selectList);

            //Create and append the options
            for (let i = 0; i < options.length; i++) {
                const option = document.createElement("option");
                option.value = options[i];
                option.text = options[i];
                selectList.appendChild(option);
            }

            let btn = document.createElement("button");
            btn.id = "btn";
            btn.innerHTML = "Play Haptic Rendering";
            contentDiv.append(btn);

            let btnStart = document.createElement("button");
            btnStart.id = "btnStart";
            btnStart.innerHTML = "Start";
            contentDiv.append(btnStart);

            // set canvas properties
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

            const img = new Image();
            img.src = imageSrc;

            // world resolution properties
            const worldPixelWidth = 800;
            const pixelsPerMeter = 6000;

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
                updateAnimation();
                window.requestAnimationFrame(draw);
            }

            // TODO: figure out type
            const rec: Array<any> = [];
            const centroids: Array<Vector> = [];
            let segments: worker.SubSegment[][];
            let objects: worker.SubSegment[][];
            let drawingInfo: [worker.Type, number, number];
            // when haply needs to move to a next segment
            let waitForInput: boolean = false;
            // when user presses a key to break out of the current haply segment

            let breakKey: null | BreakKey;

            const enum AudioMode {
                Play,
                InProgress,
                Finished,
                Idle,
            }
            let audioData: { entityIndex: number, mode: null | AudioMode } = {
                entityIndex: 0,
                mode: null
            };

            function drawBoundaries() {

                // for (const objectSegment of objects) {
                //     objectSegment.forEach(object => {
                //         if (object.bounds != undefined) {

                //             let bounds = object.bounds;
                //             let centroid = object.coordinates;

                //             let [uLX, uLY] = imgToWorldFrame(bounds[0], bounds[1]);
                //             let [lRX, lRY] = imgToWorldFrame(bounds[2], bounds[3]);
                //             let objWidth = Math.abs(uLX - lRX);
                //             let objHeight = Math.abs(uLY - lRY);
                //             ctx.strokeStyle = "black";
                //             ctx.strokeRect(uLX, uLY, objWidth, objHeight);

                //             let [cX, cY] = imgToWorldFrame(centroid[0], centroid[1]);
                //             ctx.beginPath();
                //             ctx.arc(cX, cY, 10, 0, 2 * Math.PI);
                //             ctx.strokeStyle = 'red';
                //             ctx.stroke();
                //         }
                //     })
                // }
                //console.log(currentHaplyIndex);
                //if (currentHaplyIndex != undefined) {
                //seg tracing
                // TODO: make cleaner
                if (drawingInfo != undefined) {
                    const [i, j] = [drawingInfo['segIndex'], drawingInfo['subSegIndex'];
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
                // obj tracing

                //console.log(objects);

                //console.log(objects);

                //}

                // ctx.strokeStyle = "blue";
                // let i = 0;
                // for (const segment of segments) {
                //     //ctx.strokeStyle = colors[i];
                //     //i++;
                //     segment.forEach(subSegment => {
                //         subSegment.coordinates.forEach((coord: any) => {
                //             const pX = coord[0];
                //             const pY = coord[1];
                //             let [pointX, pointY] = imgToWorldFrame(pX, pY);

                //             ctx.strokeRect(pointX, pointY, 1, 1);
                //         });
                //     });
                // }
            }

            const colors: string[] = ['red', 'blue', 'orange', 'purple',
                'green', 'brown', 'maroon', 'teal'];

            function updateAnimation() {

                // drawing bounding boxes and centroids
                drawBoundaries();
                border.draw();

                //scaling end effector position to canvas
                xE = pixelsPerMeter * (-posEE.x + 0.014);
                yE = pixelsPerMeter * (posEE.y - 0.009);


                // set position of virtual avatar in canvas
                endEffector.x = deviceOrigin.x + xE - 100;
                endEffector.y = deviceOrigin.y + yE - 167;
                endEffector.draw();
            }
            const worker = new Worker(browser.runtime.getURL("./info/worker.js"), { type: "module" });

            document.addEventListener('keydown', (event) => {
                const keyName = event.key;

                //test key to break out of current segment
                if (keyName == 'c' && audioData.entityIndex != 0) {
                    if (audioData.mode == AudioMode.Play) {
                        sourceNode.stop();
                        audioData.mode = AudioMode.Finished;
                        breakKey = BreakKey.PreviousFromAudio;
                    }
                    else {
                        breakKey = BreakKey.PreviousHaptic;
                    }
                }

                if (keyName == 'd') {
                    console.log("test");
                    if (audioData.mode == AudioMode.Play) {
                        sourceNode.stop();
                        audioData.mode = AudioMode.Finished;
                        breakKey = BreakKey.NextFromAudio;
                    }
                    else {
                        breakKey = BreakKey.NextHaptic;
                    }
                }

                // debug
                if (keyName == 'e') {
                    console.log("a");
                    console.log((xE + 300) / 800, (yE - 167) / 500, posEE.x, posEE.y);
                    //console.log(posEE.x, posEE.y);
                }

                if (keyName == 'Escape') {
                    sourceNode.stop();
                    breakKey = BreakKey.Escape;
                }

                worker.postMessage({
                    waitForInput: waitForInput,
                    breakKey: breakKey,
                    tKeyPressTime: Date.now()
                });
            });

            let sourceNode: AudioBufferSourceNode;
            function playAudioSeg(audioBuffer: any, offset: number, duration: number) {
                sourceNode = audioCtx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioCtx.destination);
                sourceNode.start(0, offset, duration);
            }

            let tAudioBegin: number;
            let playingAudio = false;

            btnStart.addEventListener("click", _ => {
                worker.postMessage({
                    start: true
                });
            })

            // event listener for serial comm button
            btn.addEventListener("click", _ => {
                // const worker = new Worker(browser.runtime.getURL("./info/worker.js"), { type: "module" });
                const filters = [
                    { usbVendorId: 0x2341 }
                ];

                let port = navigator.serial.requestPort({ filters });
                worker.postMessage({
                    renderingData: data,
                    mode: selectList.value,
                });
                //checking for changes in drop down menu
                selectList.onchange = function () {
                    worker.postMessage({
                        renderingData: data,
                        mode: selectList.value
                    });
                };

                worker.addEventListener("message", function (msg) {

                    // we've selected the COM port
                    btn.style.visibility = 'hidden';

                    // return end-effector x/y positions and objectData for updating the canvas
                    posEE.x = msg.data.positions.x;
                    posEE.y = msg.data.positions.y;
                    waitForInput = msg.data.waitForInput;

                    // grab segment data if available
                    if (msg.data.segmentData != undefined)
                        segments = msg.data.segmentData;

                    // grab object data if available
                    if (msg.data.objectData != undefined)
                        objects = msg.data.objectData;

                    // grab drawing info if available
                    if (msg.data.drawingInfo != undefined)
                        drawingInfo = msg.data.drawingInfo;

                    // only request to run draw() once
                    if (firstCall) {
                        if (msg.data.segmentData != undefined ||
                            msg.data.objectData != undefined) {
                            window.requestAnimationFrame(draw);
                            firstCall = false;
                        }
                    }

                    // see if the worker wants us to play any audio
                    if (msg.data.audioInfo != undefined) {
                        if (msg.data.audioInfo.sendAudioSignal) {
                            audioData.entityIndex = msg.data.audioInfo.entityIndex;
                            audioData.mode = AudioMode.Play;
                            worker.postMessage({
                                receivedAudioSignal: true
                            })
                        }
                    }

                    switch (audioData.mode) {
                        case AudioMode.Play: {
                            // prevent audio from playing multiple times
                            if (!playingAudio) { 
                                playingAudio = true;
                                playAudioSeg(audioBuffer,
                                    data["entities"][audioData.entityIndex]["offset"],
                                    data["entities"][audioData.entityIndex]["duration"]);
                                audioData.mode = AudioMode.InProgress;
                                tAudioBegin = Date.now();
                            }
                        }

                        // wait for the audio segment to finish
                        case AudioMode.InProgress: {
                            // include a half second buffer
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
        }

        document.getElementById("renderings-container")!.appendChild(container)
        count++;
    }
    Array.from(document.getElementsByTagName("audio")).map(i => new Plyr(i));
});

port.postMessage({
    "type": "info",
    "request_uuid": request_uuid
});

/**
 * 
 * @param x1 x position in the normalized 0 -> 1 coordinate system
 * @param y1 y position in the normalized 0 -> 1 coordinate system
 * @returns Tuple containing the [x, y] position for the canvas
 */
function imgToWorldFrame(x1: number, y1: number): [number, number] {
    const x = x1 * canvasWidth;
    const y = y1 * canvasHeight;
    return [x, y]
}