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
import { processMAPImages, processMaps } from './maps/maps-utils';
import { getContext, showImageOptionsModal } from "./utils";
import { MESSAGE_TYPES, RENDER_TYPES } from "./types/message-types.constants";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();
var extVersion = process.env.NODE_ENV || "";
let showInvisibleButtons = true;
let monarchEnabled = false;
//console.debug("Extension Version", extVersion);

// version - required for highcharts
var versionDiv = document.createElement("div");
versionDiv.id = "version-div";
versionDiv.setAttribute("ext-version", extVersion);
(document.head || document.documentElement).appendChild(versionDiv);

var styleDiv = document.createElement("style");
//styleDiv.textContent = ".sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;}";
styleDiv.textContent += ".display-none{ display: none; !important}";
(document.head || document.documentElement).appendChild(styleDiv);

var script = document.createElement('script');
script.src = browser.runtime.getURL('buttons.js');
(document.head || document.documentElement).appendChild(script);
script.onload = function () {
    script.remove();
};

window.addEventListener("message", function (event) {
    // We only accept messages from our script in highcharts.js
    if (event.source != window)
        return;
    if (event.data.messageFrom && (event.data.messageFrom == "AuthoringTool")) {
        //console.log(" Message from Authoring Tool", JSON.parse(event.data.storageData));
        let storageData = JSON.parse(event.data.storageData);
        port.postMessage({
            type: MESSAGE_TYPES.DATA_FROM_AUTHORING_TOOL,
            storageData: storageData
        })
    }
    if (event.data.messageFrom && (event.data.messageFrom == "imageCharts")) {
        port.postMessage({
            "type": MESSAGE_TYPES.CHART_RESOURCE,
            "highChartsData": event.data.charts || null,
            "toRender": RENDER_TYPES.FULL
        });
    }
    if (event.data.messageFrom && (event.data.messageFrom == "screenReaderGraphic")) {
        let imageData = event.data.imageData;
        port.postMessage({
            "type": MESSAGE_TYPES.CHECK_IMAGE_SIZE,
            "context": "",
            "dims": [imageData.naturalWidth, imageData.naturalHeight],
            "url": window.location.href,
            "sourceURL": imageData.sourceURL,
            "toRender": RENDER_TYPES.FULL,
            "redirectToTAT": event.data.redirectToTAT,
            "sendToMonarch": event.data.sendToMonarch,
        });
    }
});



document.addEventListener("contextmenu", (evt: Event) => {
    selectedElement = evt.target as HTMLElement;
    //console.debug(selectedElement.id);
});
function displayInvisibleButtons(){
    //console.log("DisplayInvisibleButtons");
    showInvisibleButtons = true;
    document.querySelectorAll(".sr-button").forEach((element)=>{
        var button = element as HTMLButtonElement
        button.classList.add("sr-only");
        button.classList.remove("display-none");
        //button.style.display = "none";
    })
}

function hideInvisibleButtons(){
    //console.log("hideInvisibleButtons");
    showInvisibleButtons = false;
    document.querySelectorAll(".sr-button").forEach((element)=>{
        var button = element as HTMLButtonElement
        button.classList.remove("sr-only");
        button.classList.add("display-none");
    })
}


function displayInvisibleDropdowns() {
    document.querySelectorAll('.monarch-dropdown-sr-only').forEach(dropdown => {
        dropdown.classList.remove('display-none');
        dropdown.classList.add('sr-only');
    });
}

function hideInvisibleDropdowns() {
    document.querySelectorAll('.monarch-dropdown-sr-only').forEach(dropdown => {
        dropdown.classList.remove('sr-only');
        dropdown.classList.add('display-none');
    });
}

port.onMessage.addListener(async message => {
    const serializer = new XMLSerializer();
    let imageElement: HTMLImageElement;
    if(message && message.status == "ping" ) return;
    if (message["type"] === MESSAGE_TYPES.HANDLE_INVISIBLE_BUTTON) {
        monarchEnabled = message["monarchEnabled"];
        
        if (monarchEnabled) {
            hideInvisibleButtons();
            message["displayInvisibleButtons"] ? displayInvisibleDropdowns() : hideInvisibleDropdowns();
        } else {
            hideInvisibleDropdowns();
            message["displayInvisibleButtons"] ? displayInvisibleButtons() : hideInvisibleButtons();
        }
        
        return;
    }
    if (selectedElement instanceof HTMLImageElement) {
        imageElement = selectedElement;
    } else {
        imageElement = selectedElement?.querySelector("img") as HTMLImageElement;
    }
    //console.debug(imageElement.currentSrc);
    //console.debug(port);
    //console.debug(message);
    const scheme = imageElement.currentSrc.split(":")[0];
    //console.debug("message received", message);
    let toRender = "";
    if (message["type"] === MESSAGE_TYPES.RESOURCE_REQUEST) {
        toRender = RENDER_TYPES.FULL;
    }
    if (message["type"] === MESSAGE_TYPES.PREPROCESS_REQUEST) {
        toRender = RENDER_TYPES.PREPROCESS;
    }
    if (message["type"] === MESSAGE_TYPES.ONLY_REQUEST) {
        toRender = RENDER_TYPES.NONE;
    }
    if(message["type"] === MESSAGE_TYPES.TACTILE_AUTHORING_TOOL){
        toRender = RENDER_TYPES.FULL;
        message["redirectToTAT"] = true;
        message["sendToMonarch"] = false; 
    }
    if(message["type"] === MESSAGE_TYPES.SEND_TO_MONARCH){
        toRender = RENDER_TYPES.FULL;
        message["redirectToTAT"] = true;
        message["sendToMonarch"] = true; 
    }
    if (message["type"] === MESSAGE_TYPES.COMPRESS_IMAGE) {
        console.debug("compressing inside content script");
        //let blobFile = new File([new Blob(message["graphicBlobStr"])], "buffer.jpg", {type: message["blobType"]});
        let blob = base64toBlob(message["graphicBlobStr"], message["blobType"]);
        const blobFile = new File([blob], "buffer.jpg", { type: message["blobType"] });
        const options = {
            maxSizeMB: 4,
            useWebWorker: true,
            alwaysKeepResolution: true,
        }
        const compressedFile = await imageCompression(blobFile, options);
        let compressedBlob = new Blob([compressedFile], { type: message["blobType"] });
        let graphicBlob = compressedBlob;
        const graphicBlobStr = await blobToBase64(graphicBlob);
        port.postMessage({
            "type": MESSAGE_TYPES.RESOURCE,
            "context": selectedElement ? getContext(selectedElement) : null,
            "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
            "url": window.location.href,
            "sourceURL": imageElement.currentSrc,
            "toRender": toRender || RENDER_TYPES.FULL,
            "graphicBlob": graphicBlobStr
        });
        return;
    }
    if (scheme === "http" || scheme === "https" || scheme === "data") {
        port.postMessage({
            "type": MESSAGE_TYPES.CHECK_IMAGE_SIZE,
            "context": selectedElement ? getContext(selectedElement) : null,
            "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
            "url": window.location.href,
            "sourceURL": imageElement.currentSrc,
            "toRender": toRender,
            "redirectToTAT": message["redirectToTAT"],
            "sendToMonarch" : message["sendToMonarch"]
        });
    } else if (scheme === "file") {
        console.debug("File!");
        fetch(imageElement.currentSrc, { mode: "same-origin" }).then(resp => {
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
                "type": MESSAGE_TYPES.LOCAL_RESOURCE,
                "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
                "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
                "image": image,
                "toRender": toRender
            });
        });
    }

});

function blobToBase64(blob: Blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
};

function base64toBlob(dataURI: string, type: string) {
    var byteString = atob(dataURI.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);

    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/jpeg' });
}
// Process images on page
Array.from(document.getElementsByTagName("img")).forEach(image => {
    if (!image.hasAttribute("tabindex") && !image.closest("a")) {
        image.setAttribute("tabindex", "0");
    }
});

console.debug("ext version from content", extVersion);
document.onreadystatechange = function () {
    setTimeout(function () {
        if (document.readyState === 'complete') {
            // Process maps on page
            processMaps(document, port, extVersion);
            processMAPImages(document, port, extVersion);
            if (showInvisibleButtons){
                (monarchEnabled) ? displayInvisibleDropdowns() : displayInvisibleButtons();
            } else {
                (monarchEnabled) ? hideInvisibleDropdowns() : hideInvisibleButtons();
            }
        }
    }, 1500)
}

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && (event.key === 'b' || event.key == 'B')) {
        if(document.activeElement && document.activeElement.tagName == "IMG"){
            let selectedElement = document.activeElement as HTMLElement;
            let imageElement = selectedElement as HTMLImageElement;
            if(monarchEnabled){
                showImageOptionsModal(selectedElement, imageElement, port);
            } else {
                port.postMessage({
                    "type": MESSAGE_TYPES.CHECK_IMAGE_SIZE,
                    "context": selectedElement ? getContext(selectedElement) : null,
                    "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
                    "url": window.location.href,
                    "sourceURL": imageElement.currentSrc,
                    "toRender": RENDER_TYPES.FULL
                });
            }
        }
    }
});
