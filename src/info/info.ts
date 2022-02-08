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
    console.debug(renderings);

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
            const audio = document.createElement("audio");
            audio.setAttribute("controls", "");
            audio.setAttribute("src", rendering["data"]["audioFile"] as string);
            contentDiv.append(audio);
            const player = new Plyr(audio, { seekTime: 0 });
            const download = document.createElement("a");
            download.setAttribute("href", rendering["data"]["audioFile"] as string);
            download.setAttribute("download", "rendering-" + count + "-" + request_uuid);
            download.textContent = "Download Audio File";
            contentDiv.append(download);
            const audioInfo = rendering["data"]["audioInfo"] as { "name": string, "offset": number, "duration": number }[];
            // eslint-disable-next-line
            // @ts-ignore
            player.on("keypress", (e: KeyboardEvent) => {
                if (e.key === "ArrowLeft") {
                    // Get previous segment
                    let i = 0;
                    // Include 1 second grace period
                    for (; audioInfo[i].offset + 1 < player.currentTime && i < audioInfo.length; i++) {}
                    if (i > 0) {
                        // Move to previous
                        player.currentTime = audioInfo[i - 1].offset;
                    }
                } else if (e.key === "ArrowRight") {
                    // Get next segment
                    let i = 0;
                    for (; audioInfo[i].offset < player.currentTime && i < audioInfo.length; i++) {}
                    if (i < audioInfo.length) {
                        // Good segment, move to next
                        player.currentTime = audioInfo[i].offset;
                    }
                }
            });
        }
        else if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.SimpleHaptics") {

            let endEffector: canvasCircle;
            let border: canvasRectangle;

            // end effector x/y coordinates
            let posEE: vector;
            // transformed canvas coordinates
            let xE, yE: number;
            let deviceOrigin: vector;
            // virtual end effector avatar offset
            const offset = 100;
            let objectData: any;
            var firstCall: boolean = true;

            // get data from the handler
            const imageSrc = rendering["data"]["image"] as string;
            const data = rendering["data"]["data"] as Array<JSON>;

            // add rendering button
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);

            var options = ["Passive",
                "Active",
                "Vibration"];

            //Create and append select list
            var selectList = document.createElement("select");
            selectList.id = "mySelect";
            contentDiv.appendChild(selectList);

            //Create and append the options
            for (var i = 0; i < options.length; i++) {
                var option = document.createElement("option");
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
            canvas.style.position = "absolute";
            canvas.style.border = "1px solid";
            contentDiv.append(document.createElement("br"));
            contentDiv.append(canvas);
            const res = canvas.getContext('2d');
            if (!res || !(res instanceof CanvasRenderingContext2D)) {
                throw new Error('Failed to get 2D context');
            }
            const ctx: CanvasRenderingContext2D = res;

            var img = new Image();
            img.src = imageSrc;

            let worker;

            // world resolution properties
            const worldPixelWidth = 1000;
            const pixelsPerMeter = 4000;

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

            var rec: Array<any> = [];
            var centroids: Array<vector> = [];
            // creating bounding boxes and centroid circles using the coordinates from haptics handler
            function createRect() {
                for (var i = 0; i < objectData.length; i++) {

                    // transform coordinates into haply frame of reference
                    // horizontal/vertical positions
                    let [uLX, uLY] = imgToWorldFrame(objectData[i].coords[0], objectData[i].coords[1]);
                    let [lRX, lRY] = imgToWorldFrame(objectData[i].coords[2], objectData[i].coords[3]);
                    // centroid
                    let [cX, cY] = imgToWorldFrame(objectData[i].centroid[0], objectData[i].centroid[1]);

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

            function drawBoundaries() {

                for (var i = 0; i < rec.length; i++) {
                    var s = rec[i];
                    ctx.strokeStyle = "red";
                    ctx.strokeRect(s.x, s.y, s.width, s.height);

                    var c = centroids[i];
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 10, 0, 2 * Math.PI);
                    ctx.strokeStyle = "white";
                    ctx.stroke();
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
                endEffector.x = deviceOrigin.x + xE - offset;
                endEffector.y = deviceOrigin.y + yE - offset;
                endEffector.draw();

            }

            endEffector.draw();

            // event listener for serial comm button
            btn.addEventListener("click", _ => {
                const worker = new Worker(browser.runtime.getURL("./info/worker.js"), { type: "module" });
                let port = navigator.serial.requestPort();
                worker.postMessage({
                    renderingData: data,
                    mode: selectList.value
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

                    // latch to call the refresh of the animation once after which the call is recursive in draw() function
                    if (firstCall) {
                        createRect();
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
function imgToWorldFrame(x1: number, y1: number) {
    var x = x1 * canvasWidth;
    var y = y1 * canvasHeight;
    return [x, y];
}
