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
//import Plyr from "plyr";
import "./info.css";
import browser from "webextension-polyfill";
import hash from "object-hash";
import { v4 as uuidv4 } from 'uuid';
import { IMAGEResponse } from "../types/response.schema";
import { IMAGERequest } from "../types/request.schema";

import * as utils from "./info-utils";
import * as hapiUtils from '../hAPI/hapi-utils';
import { RENDERERS } from '../config';
import { createSVG } from './info-utils';
import { getAllStorageSyncData, getContext } from '../utils';

import { queryLocalisation } from '../utils';

const urlParams = new URLSearchParams(window.location.search);
let request_uuid = urlParams.get("uuid") || "";
let graphic_url = urlParams.get("graphicUrl") || "";
let dimensions = urlParams.get("dimensions") || "";
let graphicWidth = Number(dimensions.split(",")[0]);
let graphicHeight = Number(dimensions.split(",")[1]);
let renderings: IMAGEResponse;
let request: IMAGERequest;
let serverUrl: string;  // Retrived through the message in case the settings have changed
let port = browser.runtime.connect();

// Play Results Arrive audio
window.onload = () => {
    let resultArriveAudio = new Audio('../audio/IMAGE-ResultsArrived.mp3');
    resultArriveAudio.play();
    setTimeout(queryLocalisation, 0);
    setTimeout(()=>{
        let title = document.getElementById("renderingTitle");
        if (title) {
            if (process.env.NODE_ENV == "development" && process.env.SUFFIX_TEXT) {
                title.textContent += process.env.SUFFIX_TEXT
            }
        }
    }, 1)
}

port.onMessage.addListener(async (message) => {
    //console.log("Message Received", message);
    if (message && (message.status == "ping")) return;
    if (message) {
        renderings = message["response"];
        request = message["request"];
        serverUrl = message["server"];
    } else {
        renderings = { "request_uuid": request_uuid, "timestamp": 0, "renderings": [] };
    }

    let label = browser.i18n.getMessage("renderingLabel");

    let count = 1;
    if (renderings) {
        for (let rendering of renderings["renderings"]) {
            let container = document.createElement("section");
            container.classList.add("container");
            container.classList.add("rendering");
            let headerElement = document.createElement("h1");
            let labelButton = document.createElement("button");
            let contentId = "m-" + uuidv4();
            labelButton.classList.add("btn", "btn-primary");
            labelButton.setAttribute("type", "button");
            labelButton.setAttribute("data-bs-toggle", "collapse");
            labelButton.setAttribute("data-bs-target", "#" + contentId);
            labelButton.setAttribute("aria-expanded", "false");
            labelButton.setAttribute("aria-controls", contentId);
            labelButton.textContent = label + " " + count + ": " + rendering["description"];
            headerElement.append(labelButton);
            container.append(headerElement);

            if (rendering["type_id"] === RENDERERS.text) {
                let contentDiv = utils.addRenderingContent(container, contentId);
                const text = rendering["data"]["text"] as string;
                const p = document.createElement("p");
                p.textContent = text;
                contentDiv.append(p);
                if (rendering["metadata"] && rendering["metadata"]["homepage"]) {
                    utils.addRenderingExplanation(contentDiv, rendering["metadata"]["homepage"])
                }
            }
            else if (rendering["type_id"] === RENDERERS.simpleAudio) {
                let contentDiv = utils.addRenderingContent(container, contentId);
                const audio = document.createElement("audio");
                audio.setAttribute("controls", "");
                audio.setAttribute("src", rendering["data"]["audio"] as string);
                contentDiv.append(audio);
                const download = document.createElement("a");
                download.setAttribute("href", rendering["data"]["audio"] as string);
                download.setAttribute("download", "rendering-" + count + "-" + request_uuid);
                download.classList.add("localisation");
                download.textContent = browser.i18n.getMessage("downloadAudioFile");
                contentDiv.append(download);
                if (rendering["metadata"] && rendering["metadata"]["homepage"]) {
                    utils.addRenderingExplanation(contentDiv, rendering["metadata"]["homepage"])
                }
            }
            else if (rendering["type_id"] === RENDERERS.segmentAudio) {
                let currentAudioIndex: number = -2;
                let contentDiv = utils.addRenderingContent(container, contentId);
                const selectDiv = document.createElement("div");
                selectDiv.classList.add("form-floating");
                const renderingsList = document.createElement("ul");
                contentDiv.append(selectDiv);
                const fullRenderingHeader = document.createElement("li");
                const fullRenderingButton = document.createElement("button");
                fullRenderingButton.id = "segmentAudioFullRendering";
                fullRenderingButton.classList.add("btn", "btn-secondary", "localisation");
                fullRenderingButton.textContent = browser.i18n.getMessage("segmentAudioFullRendering")
                fullRenderingButton.addEventListener("click", function () {
                    playPauseAudio(-1);
                });
                fullRenderingHeader.append(fullRenderingButton);
                renderingsList.append(fullRenderingHeader);

                const audioInfo = rendering["data"]["audioInfo"] as { "name": string, "offset": number, "duration": number }[];
                // Set up audio controls
                const audioCtx = new window.AudioContext();
                const audioBuffer = await fetch(rendering["data"]["audioFile"] as string).then(resp => {
                    return resp.arrayBuffer();
                }).then(buffer => {
                    return audioCtx.decodeAudioData(buffer);
                }).catch(e => { console.error(e); throw e; });

                let currentOffset: number | undefined;
                let currentDuration: number | undefined;
                let sourceNode: AudioBufferSourceNode | undefined;

                function playPauseAudio(index: number, audioInfo?: any) {
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
                            currentAudioIndex = index;
                            const data = audioInfo;
                            currentOffset = data ? data["offset"] as number : undefined;
                            currentDuration = data ? data["duration"] as number : undefined;
                            sourceNode = audioCtx.createBufferSource();
                            sourceNode.addEventListener("ended", () => { sourceNode = undefined; });
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(audioCtx.destination);
                            sourceNode.start(0, currentOffset, currentDuration);
                        }, 100);
                    }
                }

                for (let idx = 0; idx < audioInfo.length; idx++) {
                    const val = audioInfo[idx];
                    const headerElement = document.createElement("li");
                    const buttonElement = document.createElement("button");
                    buttonElement.classList.add("btn", "btn-secondary");
                    buttonElement.textContent = val["name"]
                    headerElement.append(buttonElement);
                    buttonElement.addEventListener("click", function () {
                        playPauseAudio(idx, audioInfo[idx])
                    });
                    renderingsList.append(headerElement);
                }
                selectDiv.append(renderingsList);

                const download = document.createElement("a");
                download.setAttribute("href", rendering["data"]["audioFile"] as string);
                download.setAttribute("download", "rendering-" + count + "-" + request_uuid);
                download.textContent = browser.i18n.getMessage("downloadAudioFile");
                download.id = "downloadAudioFile";
                download.classList.add("localisation");
                contentDiv.append(download);
                if (rendering["metadata"] && rendering["metadata"]["homepage"]) {
                    utils.addRenderingExplanation(contentDiv, rendering["metadata"]["homepage"])
                }
            }

            if (rendering["type_id"] === RENDERERS.photoAudioHaptics) {
                hapiUtils.processHapticsRendering(rendering, graphic_url, container, contentId)
            }

            if (rendering["type_id"] === RENDERERS.svgLayers) {
                let contentDiv = utils.addRenderingContent(container, contentId);
                const imgContainer = document.createElement("div");
                imgContainer.classList.add("info-img-container");
                // renderImg
                const renderImg = document.createElement("img");
                renderImg.id = "render-img";
                renderImg.classList.add("render-img");
                if (request && request.graphic) {
                    renderImg.src = request.graphic;
                }
                const svgContainer = document.createElement("div");
                svgContainer.classList.add("svg-container");

                // append renderImg and svgImg to imgContainer
                imgContainer.append(renderImg);
                // in case of maps, renderImg src is not available, fix svg container position
                if (!renderImg.src) {
                    svgContainer.style.position = "static";
                }
                const selectContainer = document.createElement("div");
                selectContainer.style.display = "flex";
                selectContainer.style.width = "50%";
                const selectDesc = document.createElement("p");
                // selectDesc.innerText = browser.i18n.getMessage("svgLayerSelection");
                selectDesc.id = "svgLayerSelection";
                selectDesc.classList.add("localisation");
                const select = document.createElement("select");
                select.classList.add("layer-select");
                select.setAttribute("id", "svg-layer");
                select.style.margin = "0 1rem 1rem 1rem";
                let layers: any = rendering['data']['layers'];
                for (let layer of layers) {
                    let option = document.createElement("option");
                    option.setAttribute("value", layer["svg"]);
                    option.textContent = layer["label"];
                    select.append(option);
                }
                let svgData = layers[0]["svg"];
                svgContainer.append(createSVG(svgData));

                // append container to image container
                imgContainer.append(svgContainer);


                select.addEventListener("change", (event) => {
                    const target = event.target as HTMLInputElement;
                    if (svgContainer.lastChild) {
                        svgContainer.removeChild(svgContainer.lastChild);
                    }
                    svgContainer.appendChild(createSVG(target.value));
                });
                selectContainer.append(selectDesc);
                selectContainer.append(select)
                contentDiv.append(selectContainer);
                contentDiv.append(imgContainer);
            }

            if (rendering["type_id"] == RENDERERS.tactileSvg) {
                // Tactile SVG renderings should be handled by the authoring tool
                let contentDiv = utils.addRenderingContent(container, contentId);
                
                // Create buttons container
                const buttonsContainer = document.createElement("div");
                buttonsContainer.style.display = "flex";
                buttonsContainer.style.gap = "10px";
                buttonsContainer.style.marginBottom = "1rem";
                
                // Send to TAT button
                const sendToTATButton = document.createElement("button");
                sendToTATButton.classList.add("btn", "btn-secondary");
                sendToTATButton.textContent = "Send to Tactile Authoring Tool (TAT)";
                sendToTATButton.addEventListener("click", function () {
                    const renderImg = document.createElement("img");
                    renderImg.id = "render-img";
                    renderImg.classList.add("render-img");
                    if (request && request.graphic) {
                        renderImg.src = request.graphic;
                    }
                    // Send the request to the background script for TAT
                    port.postMessage({
                        "type": "resource",
                        "context": renderImg ? getContext(renderImg) : null,
                        "dims": [graphicWidth, graphicHeight],
                        "url": graphic_url,
                        "sourceURL": renderImg.currentSrc,
                        "graphicBlob": request.graphic,
                        "toRender": "full",
                        "redirectToTAT": true,
                        "sendToMonarch": false
                    });
                });
                
                // Send to Monarch button
                const sendToMonarchButton = document.createElement("button");
                sendToMonarchButton.classList.add("btn", "btn-secondary");
                sendToMonarchButton.textContent = "Send to Monarch";
                sendToMonarchButton.addEventListener("click", function () {
                    const renderImg = document.createElement("img");
                    renderImg.id = "render-img";
                    renderImg.classList.add("render-img");
                    if (request && request.graphic) {
                        renderImg.src = request.graphic;
                    }
                    // Send the request to the background script for Monarch
                    port.postMessage({
                        "type": "resource",
                        "context": renderImg ? getContext(renderImg) : null,
                        "dims": [graphicWidth, graphicHeight],
                        "url": graphic_url,
                        "sourceURL": renderImg.currentSrc,
                        "graphicBlob": request.graphic,
                        "toRender": "full",
                        "redirectToTAT": true,
                        "sendToMonarch": true
                    });
                });
                
                buttonsContainer.append(sendToTATButton);
                buttonsContainer.append(sendToMonarchButton);
                contentDiv.append(buttonsContainer);
            }
            document.getElementById("renderings-container")!.appendChild(container)
            count++;
        }
    }

    //Array.from(document.getElementsByTagName("audio")).map(i => new Plyr(i));

    const feedbackAnchor = document.getElementById("feedbackFormLink") as HTMLAnchorElement;
    if (feedbackAnchor) {
        feedbackAnchor.href = "../feedback/feedback.html?uuid=" +
            encodeURIComponent(request_uuid) + "&hash=" +
            encodeURIComponent(hash(request)) + "&serverURL=" +
            encodeURIComponent(serverUrl);
    }

    // Load localised labels for the title, footer, buttons, etc.
    //queryLocalisation();
});

// window.addEventListener("beforeunload", function(e){
//     e.preventDefault();
//     e.returnValue = "Hello World";
//     // Do something
//     // alert("Window Closed!!");
//  });

port.postMessage({
    "type": "info",
    "request_uuid": request_uuid
});
