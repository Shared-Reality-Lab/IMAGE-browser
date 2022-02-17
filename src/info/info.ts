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
import { vector } from '../types/vector';
import { canvasCircle } from '../types/canvas-circle';
import { canvasRectangle } from '../types/canvas-rectangle';
import * as worker from './worker';

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
            let posEE: vector;
            // transformed canvas coordinates
            let xE, yE: number;
            let deviceOrigin: vector;
            // virtual end effector avatar offset
            const offset = 150;
            let objectData: any;
            let segmentData: any;
            let firstCall: boolean = true;

            // get data from the handler
            const imageSrc = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Canyon_no_Lago_de_Furnas.jpg/800px-Canyon_no_Lago_de_Furnas.jpg";
            const data = rendering["data"]["info"] as Array<JSON>;

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
                color: 'red',
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

            const rec: Array<any> = [];
            const centroids: Array<vector> = [];
            let segments: worker.SubSegment[][];
            let waitForInput: boolean = false;

            // creating bounding boxes and centroid circles using the coordinates from haptics handler
            function createRect() {
                //for (let i = 0; i < objectData.length; i++) {
                for (const obj of objectData) {
                    // transform coordinates into haply frame of reference
                    // horizontal/vertical positions
                    for (let j = 0; j < obj['centroid'].length; j++) {

                        let bounds = obj['coords'][j];
                        let centroid = obj['centroid'][j];

                        let [uLX, uLY] = imgToWorldFrame(bounds[0], bounds[1]);
                        let [lRX, lRY] = imgToWorldFrame(bounds[2], bounds[3]);

                        // centroid     
                        let [cX, cY] = imgToWorldFrame(centroid[0], centroid[1]);

                        let objWidth = Math.abs(uLX - lRX);
                        let objHeight = Math.abs(uLY - lRY);

                        rec.push({
                            x: uLX,
                            y: uLY,
                            width: objWidth,
                            height: objHeight,
                        });

                        centroids.push({
                            x: cX,
                            y: cY
                        })
                    }
                }
            }

            let donelog: boolean = false;

            function drawBoundaries() {

                for (let i = 0; i < rec.length; i++) {
                    const s = rec[i];
                    ctx.strokeStyle = "red";
                    ctx.strokeRect(s.x, s.y, s.width, s.height);

                    const c = centroids[i];
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 10, 0, 2 * Math.PI);
                    ctx.strokeStyle = "white";
                    ctx.stroke();
                }

                ctx.strokeStyle = "blue";

                for (const segment of segments) {
                    segment.forEach(subSegment => {
                        subSegment.coordinates.forEach((coord: any) => {
                            const pX = coord.x;
                            const pY = coord.y;
                            let [pointX, pointY] = imgToWorldFrame(pX, pY);

                            ctx.strokeRect(pointX, pointY, 1, 1);
                        });
                    });
                    break;
                }
            }

            function updateAnimation() {

                // drawing bounding boxes and centroids
                drawBoundaries();
                border.draw();

                //scaling end effector position to canvas
                xE = pixelsPerMeter * -posEE.x;
                yE = pixelsPerMeter * posEE.y;


                // set position of virtual avatar in canvas
                endEffector.x = deviceOrigin.x + xE - 100;
                endEffector.y = deviceOrigin.y + yE - 167;
                endEffector.draw();

                //console.log(endEffector.x, endEffector.y);

            }

            endEffector.draw();

            let keyState: number = 0;
            const worker = new Worker(browser.runtime.getURL("./info/worker.js"), { type: "module" });

            document.addEventListener('keydown', (event) => {
                const keyName = event.key;

                // if we're waiting for input from the user, send the key state
                if (waitForInput && keyName == 'b') {
                    waitForInput = !waitForInput;
                    worker.postMessage({
                        waitForInput: waitForInput,
                        tKeyPressTime: Date.now()
                    });
                }
            });

            // event listener for serial comm button
            btn.addEventListener("click", _ => {
                // const worker = new Worker(browser.runtime.getURL("./info/worker.js"), { type: "module" });
                let port = navigator.serial.requestPort();

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
                    objectData = msg.data.objectData;
                    segmentData = msg.data.segmentData;
                    waitForInput = msg.data.waitForInput;

                    // latch to call the refresh of the animation once after which the call is recursive in draw() function
                    if (firstCall) {
                        createRect();
                        segments = segmentData;
                        window.requestAnimationFrame(draw);
                        firstCall = false;
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

// scaling of coordinates to canvas
function imgToWorldFrame(x1: number, y1: number): [number, number] {
    const x = ((x1 + 0.0537) / 0.1345) * canvasWidth;
    const y = ((y1 - 0.0284) / 0.0834) * canvasHeight;
    return [x, y];
}
