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
import browser from "webextension-polyfill";
import {processIMAGEMaps} from './maps/maps-utils';
import { getContext } from "./utils";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();

var script = document.createElement('script');
script.src = browser.runtime.getURL('charts/highcharts.js');
(document.head||document.documentElement).appendChild(script);
script.onload = function() {
    script.remove();
};

window.addEventListener("message", function(event) {
    // We only accept messages from our script in highcharts.js
    if (event.source != window)
        return;
    if (event.data.messageFrom && (event.data.messageFrom == "imageCharts")) {
        port.postMessage({
            "type": "chartResource",
            "highChartsData": event.data.charts || null,
            "toRender": "full"
        });
    }   
});

document.addEventListener("contextmenu", (evt: Event) => {
    selectedElement = evt.target as HTMLElement;
    console.debug(selectedElement.id);
});
port.onMessage.addListener(message => {
    const serializer = new XMLSerializer();
    switch (message["type"]) {
        case "resourceRequest":
        case "preprocessRequest":
        case "onlyRequest":
            const serializer = new XMLSerializer();
            let imageElement: HTMLImageElement;
            if (selectedElement instanceof HTMLImageElement ) {
                imageElement = selectedElement;
            } else {
                imageElement = selectedElement?.querySelector("img") as HTMLImageElement;
            }
            console.debug(imageElement.currentSrc);
            console.debug(port);
            const scheme = imageElement.currentSrc.split(":")[0];
            // Determine amount of rendering to request.
            let toRender = "";
            if (message["type"] === "resourceRequest") {
                toRender = "full";
            } else if (message["type"] === "preprocessRequest") {
                toRender = "preprocess";
            } else if (message["type"] === "onlyRequest") {
                toRender = "none";
            }
            if (scheme === "http" || scheme === "https" || scheme==="data") {
                port.postMessage({
                    "type": "resource",
                    "context": selectedElement ? getContext(selectedElement) : null,
                    "dims": [ imageElement.naturalWidth, imageElement.naturalHeight ],
                    "url": window.location.href,
                    "sourceURL": imageElement.currentSrc,
                    "toRender": toRender
                });
            } else if (scheme === "file") {
                console.debug("File!");
                fetch(imageElement.currentSrc).then(resp => {
                    if (resp.ok) {
                        return resp.blob();
                    } else {
                        throw resp;
                    }
                }).then(blob => {
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(blob);
                    });
                }).then(image => {
                    port.postMessage({
                        "type": "localResource",
                        "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
                        "dims": [ imageElement.naturalWidth, imageElement.naturalHeight ],
                        "image": image,
                        "toRender": toRender
                    });
                });
            }
            break;
        default:
            console.debug(message["type"]);
            break;
    }
    return true;
});

// Process images on page
Array.from(document.getElementsByTagName("img")).forEach(image => {
    if (!image.hasAttribute("tabindex") && !image.closest("a")) {
        image.setAttribute("tabindex", "0");
    }
});


// Process maps on page
processIMAGEMaps(document, port);



