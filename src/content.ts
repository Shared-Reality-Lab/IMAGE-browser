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
import imageCompression from "browser-image-compression";
import browser from "webextension-polyfill";
import {processMAPImages, processMaps} from './maps/maps-utils';
import { getContext } from "./utils";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();
var extVersion = process.env.NODE_ENV || "";
//console.log("Extension Version", extVersion);

var versionDiv = document.createElement("div");
versionDiv.id="version-div";
versionDiv.setAttribute("ext-version", extVersion);
(document.head||document.documentElement).appendChild(versionDiv);

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
port.onMessage.addListener(async message => {
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
            if (scheme === "http" || scheme === "https" || scheme === "data") {
                let blob = await fetch(imageElement.currentSrc).then(r => r.blob());
                const blobFile = new File([blob], "buffer.jpg", { type: blob.type });
                const sizeMb = blobFile.size / 1024 / 1024;
                let graphicBlob = blob;
                if (sizeMb > 4) {
                    console.debug(`originalFile size ${sizeMb} MB`);
                    const options = {
                        maxSizeMB: 4,
                        useWebWorker: true,
                        alwaysKeepResolution: true,
                    }
                    const compressedFile = await imageCompression(blobFile, options);
                    console.debug(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB
                    let compressedBlob = new Blob([compressedFile], { type: blob.type });
                    graphicBlob = compressedBlob;
                };
                function blobToBase64(blob: Blob) {
                    return new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.onerror = () => reject(reader.error);
                      reader.readAsDataURL(blob);
                    });
                  };
                const graphicBlobStr = await blobToBase64(graphicBlob);
                port.postMessage({
                    "type": "resource",
                    "context": selectedElement ? getContext(selectedElement) : null,
                    "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
                    "url": window.location.href,
                    "sourceURL": imageElement.currentSrc,
                    "toRender": toRender,
                    "graphicBlob": graphicBlobStr
                });
            } else if (scheme === "file") {
                console.debug("File!");
                fetch(imageElement.currentSrc, {mode: "same-origin"}).then(resp => {
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

console.log("ext version from content", extVersion);
document.onreadystatechange = function () {
    setTimeout(function () {
        if (document.readyState === 'complete') {
            // Process maps on page
            processMaps(document, port, extVersion);
            processMAPImages(document, port, extVersion);
        }
    }, 1500)
}




