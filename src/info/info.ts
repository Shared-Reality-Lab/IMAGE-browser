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
import * as utils from "./info-utils";

// let request_uuid = window.location.search.substring(1);
const urlParams = new URLSearchParams(window.location.search);
let request_uuid = urlParams.get("uuid") || "";
let graphic_url = urlParams.get("graphicUrl") || "";

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
            let deviceOrigin: Vector;

            // virtual end effector avatar offset
            const offset = 150;
            let firstCall = true;

            const data = rendering["data"]["info"] as Array<JSON>;

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
            let btn = utils.createButton(contentDiv, "btn", "Connect to Haply");
            let btnStart = utils.createButton(contentDiv, "btnStart", "Start");
            let btnEscape = utils.createButton(contentDiv, "btnEscape", "Stop");
            let btnNext = utils.createButton(contentDiv, "btnNext", "Next");
            let btnPrev = utils.createButton(contentDiv, "btnPrev", "Previous");

            // creating canvas
            const [canvas, res, ctx] = utils.createCanvas(contentDiv);
            const img = new Image();
            img.src = graphic_url;

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
                utils.updateAnimation(posEE, endEffector, deviceOrigin, border, drawingInfo, segments, objects, ctx);
                window.requestAnimationFrame(draw);
            }

            // define segments and objects
            let segments: worker.SubSegment[][];
            let objects: worker.SubSegment[][];
            let drawingInfo: [worker.Type, number, number];
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

                // debug, for printing coords
                if (keyName == 'e') {
                    //console.log((xE + 300) / 800, (yE - 167) / 500, posEE.x, posEE.y);
                    //console.log(posEE.x, posEE.y);
                }

                worker.postMessage({
                    waitForInput: waitForInput,
                    breakKey: breakKey,
                    tKeyPressTime: Date.now()
                });
            });

            // Play an audio segment with a given offset and duration.
            let sourceNode: AudioBufferSourceNode;
            function playAudioSeg(audioBuffer: any, offset: number, duration: number) {
                sourceNode = audioCtx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioCtx.destination);
                sourceNode.start(0, offset, duration);
            }

            // Start
            btnStart.addEventListener("click", _ => {
                worker.postMessage({
                    start: true
                });
            })

            // Stop
            btnEscape.addEventListener("click", _ => {
                sourceNode.stop();
                breakKey = BreakKey.Escape;
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
                let hapticPort = await navigator.serial.requestPort();

                // send all the rendering info
                worker.postMessage({
                    renderingData: data
                });


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
                                console.log("index is", audioData.entityIndex);
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

        document.getElementById("renderings-container")!.appendChild(container)
        count++;
    }
    Array.from(document.getElementsByTagName("audio")).map(i => new Plyr(i));
});

port.postMessage({
    "type": "info",
    "request_uuid": request_uuid
});