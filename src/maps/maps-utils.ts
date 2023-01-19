import browser from "webextension-polyfill";
import { IMAGERequest } from "../types/request.schema";
import { getCapabilities, getRenderers } from "../utils";
import { v4 as uuidv4 } from "uuid";

export function processMap(port: browser.Runtime.Port, map: any, origin: string, extVersion?: string, ) {
    // domains list at www.google.com/supported_domains, but this is too long to manually put
    if (map.hasAttribute("src") && 
        ((origin == "iframe" && (/google.[\w\.]+\/maps/.test(map.src)) || (origin == "staticImage" && (/google.[\w\.]+\/maps\/api/.test(map.src)))))) {

        map.setAttribute("tabindex", "0");
        let mapButton = document.createElement("button");

        mapButton.innerText = browser.i18n.getMessage("getMapRendering");
        //console.log("ext version from map", extVersion);
        if (extVersion === "test") {
            mapButton.innerText += process.env.SUFFIX_TEXT;
        }
        let preprocessorMapButton = document.createElement("button");
        preprocessorMapButton.innerText = browser.i18n.getMessage("getMapPreprocessorResponse");
        // Get all the information about our found map and store the info. Then create a button to render the map
        mapButton.addEventListener("click", () => {
            sendMapRequest(port, map, "full");
        });

        mapButton.setAttribute("tabindex", "0");
        let buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.marginTop = "5px";

        preprocessorMapButton.setAttribute("id", "preprocessor-map-button");

        preprocessorMapButton.addEventListener("click", () => {
            sendMapRequest(port, map, "preprocess");
        });
        buttonContainer.appendChild(mapButton);
        buttonContainer.appendChild(preprocessorMapButton);
        map.insertAdjacentElement("afterend", buttonContainer);
        map.parentElement.style.overflow = "visible";
    }
}

export async function generateMapQuery(message: { context: string, coordinates: [number, number] }): Promise<IMAGERequest> {
    let renderers = await getRenderers();
    let capabilities = await getCapabilities();
    return {
        "request_uuid": uuidv4(),
        "timestamp": Math.round(Date.now() / 1000),
        "coordinates": {
            "latitude": message.coordinates[0],
            "longitude": message.coordinates[1]
        },
        "context": message.context,
        "language": "en",
        "capabilities": capabilities,
        "renderers": renderers
    } as IMAGERequest;
}

export async function generateMapSearchQuery(message: { context: string, placeID: string, }): Promise<IMAGERequest> {
    let renderers = await getRenderers();
    let capabilities = await getCapabilities();
    return {
        "request_uuid": uuidv4(),
        "timestamp": Math.round(Date.now() / 1000),
        "placeID": message.placeID,
        "context": message.context,
        "language": "en",
        "capabilities": capabilities,
        "renderers": renderers
    } as IMAGERequest;
}

function sendMapRequest(port: browser.Runtime.Port, map: HTMLIFrameElement, toRender: String) {
    const serializer = new XMLSerializer();
    let src = map.getAttribute("src");
    let q, lat, lon, zoom;
    let maptype = "roadmap";
    if (src?.includes("&q=")) { // assume src is not null and then look for a query string
        let i1 = src.indexOf("&q=") + 3;
        let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1); // query either goes to the end or there is another header
        q = src.substring(i1, i2);
    }
    if (src?.includes("&center=")) { // try to find center of map
        let i1 = src.indexOf("&center=") + 8;
        let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1);
        let center = src.substring(i1, i2);
        lat = center.split(",")[0];
        lon = center.split(",")[1];
    }
    if (src?.includes("&zoom=")) { // try to find zoom of map
        let i1 = src.indexOf("&zoom=") + 6;
        let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1);
        zoom = src.substring(i1, i2);
    }
    if (src?.includes("&maptype=satellite")) { // only important map type right now is satellite
        maptype = "satellite";
    }
    if (lat && lon) { // only send the resource request if we have a lat and lon
        console.debug("Sending map resource request");
        port.postMessage({
            "type": "mapResource",
            "context": map ? serializer.serializeToString(map) : null,
            "coordinates": [parseFloat(lat), parseFloat(lon)],
            "toRender": toRender
        });
    } else if (q) { // if we don't have a lat and lon, but we have a query, send a search request
        console.debug("Sending map search request");
        port.postMessage({
            "type": "mapSearch",
            "context": map ? serializer.serializeToString(map) : null,
            "placeID": q,
            "toRender": toRender
        });
    }
}

export function processMaps(document: Document, port: browser.Runtime.Port,  extVersion?: string) {
    Array.from(document.getElementsByTagName("iframe")).forEach((map) => processMap(port, map, "iframe", extVersion));
}

export function processMAPImages(document: Document, port: browser.Runtime.Port, extVersion?: string) {
    Array.from(document.getElementsByTagName("img")).forEach((map) => processMap(port, map, "staticImage", extVersion));
}
