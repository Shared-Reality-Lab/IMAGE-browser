import browser from "webextension-polyfill";
import { IMAGERequest } from "../types/request.schema";
import { getCapabilities, getRenderers, getLanguage } from "../utils";
import { v4 as uuidv4 } from "uuid";

export function processMap(port: browser.Runtime.Port, map: any, origin: string, extVersion?: string, ) {
    // domains list at www.google.com/supported_domains, but this is too long to manually put
    if (map.hasAttribute("src") && 
    //    
    ((origin == "iframe" && ((/google.[\w\.]+\/maps\/embed\/v1/.test(map.src) || (/google.[\w\.]+\/maps\?/.test(map.src))))
         || (origin == "staticImage" && (/google.[\w\.]+\/maps\/api/.test(map.src)))))) {

        map.setAttribute("tabindex", "0");
        let mapButton = document.createElement("button");

        mapButton.innerText = browser.i18n.getMessage("getMapRendering");
        //console.log("ext version from map", extVersion);
        if (extVersion === "development") {
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
        buttonContainer.style.marginTop = "1rem";
        buttonContainer.style.position = "relative";

        preprocessorMapButton.setAttribute("id", "preprocessor-map-button");

        preprocessorMapButton.addEventListener("click", () => {
            sendMapRequest(port, map, "preprocess");
        });
        buttonContainer.appendChild(mapButton);
        buttonContainer.appendChild(preprocessorMapButton);
        let parentElement = map;
        // handle cases when map(image) is embedded in an anchor tag - necessary to fix the layout
        if (map.parentNode.nodeName.toLowerCase() === "a" ){
            parentElement = parentElement.parentElement;
        }
        parentElement.insertAdjacentElement("afterend", buttonContainer);
        parentElement.parentElement.style.overflow = "visible";
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
        "language": await getLanguage(),
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
        "language": await getLanguage(),
        "capabilities": capabilities,
        "renderers": renderers
    } as IMAGERequest;
}

function sendMapRequest(port: browser.Runtime.Port, map: HTMLIFrameElement, toRender: String) {
    const serializer = new XMLSerializer();
    let src = map.getAttribute("src");
    let q, lat, lon, zoom;
    //let maptype = "roadmap";
    console.log(src);
    if(src){
        const mapUrl = new URL(src);
        const searchParams = mapUrl.searchParams;
        /** from the map source extract following params */
        q = searchParams.get("q");
        let latLongStr = searchParams.get("center") || searchParams.get("markers");
        // let zoom = searchParams.get("zoom");
        // let mapType = searchParams.get("mapType");
        if(latLongStr){
            lat = latLongStr.split(",")[0];
            lon = latLongStr.split(",")[1];
        }
        if (lat && lon) { // only send the resource request if we have a lat and lon
            console.debug("Sending map resource request");
            console.debug("lat long", lat, lon);
            port.postMessage({
                "type": "mapResource",
                "context": map ? serializer.serializeToString(map) : null,
                "coordinates": [parseFloat(lat), parseFloat(lon)],
                "toRender": toRender
            });
        } else if (q) { // if we don't have a lat and lon, but we have a query, send a search request
            console.debug("Sending map search request");
            console.debug("q", q);
            port.postMessage({
                "type": "mapSearch",
                "context": map ? serializer.serializeToString(map) : null,
                "placeID": q,
                "toRender": toRender
            });
        }
    } else{
        console.debug("Map Source empty!");
    }
    }


export function processMaps(document: Document, port: browser.Runtime.Port,  extVersion?: string) {
    Array.from(document.getElementsByTagName("iframe")).forEach((map) => processMap(port, map, "iframe", extVersion));
}

export function processMAPImages(document: Document, port: browser.Runtime.Port, extVersion?: string) {
    Array.from(document.getElementsByTagName("img")).forEach((map) => processMap(port, map, "staticImage", extVersion));
}
