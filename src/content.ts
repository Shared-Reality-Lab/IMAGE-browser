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
import { getContext } from "./utils";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();
var extVersion = process.env.NODE_ENV || "";
let showInvisibleButtons = true;
//console.debug("Extension Version", extVersion);

// var versionDiv = document.createElement("div");
// versionDiv.id = "version-div";
// versionDiv.setAttribute("ext-version", extVersion);

var styleDiv = document.createElement("style");
//versionDiv.id = "version-div";
styleDiv.textContent = ".sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;}";
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
    if (event.data.messageFrom && (event.data.messageFrom == "imageCharts")) {
        port.postMessage({
            "type": "chartResource",
            "highChartsData": event.data.charts || null,
            "toRender": "full"
        });
    }
    if (event.data.messageFrom && (event.data.messageFrom == "screenReaderGraphic")) {
        let imageData = event.data.imageData;
        port.postMessage({
            "type": "checkImageSize",
            "context": "",
            "dims": [imageData.naturalWidth, imageData.naturalHeight],
            "url": window.location.href,
            "sourceURL": imageData.sourceURL,
            "toRender": "full"
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

port.onMessage.addListener(async message => {
    const serializer = new XMLSerializer();
    let imageElement: HTMLImageElement;
    if(message && message.status == "ping" ) return;
    if(message["type"] === "handleInvisibleButton"){
        if(message["displayInvisibleButtons"]){
            displayInvisibleButtons();
        } else {
            hideInvisibleButtons();
        }
        //console.log("message received inside content script", message["displayInvisibleButtons"]);
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
    if (message["type"] === "resourceRequest") {
        toRender = "full";
    }
    if (message["type"] === "preprocessRequest") {
        toRender = "preprocess";
    }
    if (message["type"] === "onlyRequest") {
        toRender = "none"
    }
    if (message["type"] === "compressImage") {
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
            "type": "resource",
            "context": selectedElement ? getContext(selectedElement) : null,
            "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
            "url": window.location.href,
            "sourceURL": imageElement.currentSrc,
            "toRender": toRender || "full",
            "graphicBlob": graphicBlobStr
        });
        return;
    }
    if (scheme === "http" || scheme === "https" || scheme === "data") {
        port.postMessage({
            "type": "checkImageSize",
            "context": selectedElement ? getContext(selectedElement) : null,
            "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
            "url": window.location.href,
            "sourceURL": imageElement.currentSrc,
            "toRender": toRender
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
                "type": "localResource",
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
                displayInvisibleButtons();
            } else {
                hideInvisibleButtons();
            }
        }
    }, 1500)
}

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && (event.key === 'b' || event.key == 'B')) {
        // console.log('Hotkey pressed');
        // console.log('Active Element', document.activeElement);
        // console.log(document.activeElement?.tagName);
        if(document.activeElement && document.activeElement.tagName == "IMG"){
            let selectedElement = document.activeElement as HTMLElement;
            let imageElement = selectedElement as HTMLImageElement;
            let toRender = "full";
            port.postMessage({
                "type": "checkImageSize",
                "context": selectedElement ? getContext(selectedElement) : null,
                "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
                "url": window.location.href,
                "sourceURL": imageElement.currentSrc,
                "toRender": toRender
            });
        }
    }
});
