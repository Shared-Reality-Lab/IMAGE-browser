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
import hash from "object-hash";
import { v4 as uuidv4 } from 'uuid';
import { IMAGEResponse } from "../types/response.schema";
import { IMAGERequest } from "../types/request.schema";

import * as utils from "./info-utils";
import * as hapiUtils from '../hAPI/hapi-utils';
import { RENDERERS } from '../config';

const urlParams = new URLSearchParams(window.location.search);
let request_uuid = urlParams.get("uuid") || "";
let graphic_url = urlParams.get("graphicUrl") || "";

let renderings: IMAGEResponse;
let request: IMAGERequest;
let serverUrl: string;  // Retrived through the message in case the settings have changed
let port = browser.runtime.connect();



port.onMessage.addListener(async (message) => {
    if (message) {
        renderings = message["response"];
        request = message["request"];
        serverUrl = message["server"];
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
            download.textContent = "Download Audio File";
            contentDiv.append(download);
            if (rendering["metadata"] && rendering["metadata"]["homepage"]) {
                utils.addRenderingExplanation(contentDiv, rendering["metadata"]["homepage"])
            }
        }
        else if (rendering["type_id"] === RENDERERS.segmentAudio) {
            let contentDiv = utils.addRenderingContent(container, contentId);
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
            // Construct dropdown menu from returned audio segments
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

            const download = document.createElement("a");
            download.setAttribute("href", rendering["data"]["audioFile"] as string);
            download.setAttribute("download", "rendering-" + count + "-" + request_uuid);
            download.textContent = "Download Audio File";
            contentDiv.append(download);
            if (rendering["metadata"] && rendering["metadata"]["homepage"]) {
                utils.addRenderingExplanation(contentDiv, rendering["metadata"]["homepage"])
            }
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
                if (sourceNode !== undefined) {
                    sourceNode.stop();
                } else {
                    sourceNode = audioCtx.createBufferSource();
                    sourceNode.addEventListener("ended", () => { sourceNode = undefined; });
                    sourceNode.buffer = audioBuffer;
                    sourceNode.connect(audioCtx.destination);
                    sourceNode.start(0, currentOffset, currentDuration);
                }
            });
        }

        if (rendering["type_id"] === RENDERERS.photoAudioHaptics) {
            hapiUtils.processHapticsRendering(rendering, graphic_url, container, contentId)
        }

        document.getElementById("renderings-container")!.appendChild(container)
        count++;
    }
    Array.from(document.getElementsByTagName("audio")).map(i => new Plyr(i));

    const feedbackAnchor = document.getElementById("feedback-a") as HTMLAnchorElement;
    if (feedbackAnchor) {
        feedbackAnchor.href = "../feedback/feedback.html?uuid=" +
                encodeURIComponent(request_uuid) + "&hash=" +
                encodeURIComponent(hash(request)) + "&serverURL=" +
                encodeURIComponent(serverUrl);
    }
});

port.postMessage({
    "type": "info",
    "request_uuid": request_uuid
});
