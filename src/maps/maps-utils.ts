import browser from "webextension-polyfill";
import { IMAGERequest } from "../types/request.schema";
import { getCapabilities, getRenderers, getLanguage } from "../utils";
import { v4 as uuidv4 } from "uuid";

type ServerOptions = {toRender: string, redirectToTAT?: boolean, sendToMonarch?: boolean};

enum MapType {
    GOOGLE = "Google",
    OPENSTREET = "OpenStreet"
}

export function processMap(port: browser.Runtime.Port, map: any, origin: string, extVersion?: string, ) {
    // domains list at www.google.com/supported_domains, but this is too long to manually put
    const mapType = checkMapType(map, origin);
    if (map.hasAttribute("src") && mapType !== undefined) {   
        map.setAttribute("tabindex", "0");
        let mapButton = document.createElement("button");

        mapButton.innerText = browser.i18n.getMessage("getMapRendering");
        //console.log("ext version from map", extVersion);
        if (extVersion === "development") {
            mapButton.innerText += process.env.SUFFIX_TEXT;
        }
        // Get all the information about our found map and store the info. Then create a button to render the map
        mapButton.addEventListener("click", () => {
            sendMapRequest(port, map, mapType, {toRender:"full"});
        });
        mapButton.setAttribute("id", "map-button");
        
        let buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.marginTop = "1rem";
        buttonContainer.style.position = "relative";
        buttonContainer.setAttribute("id", "map-button-container");
        buttonContainer.appendChild(mapButton);

        let selectElement = document.createElement("select");
        const mapOptions = [
            {option: "Select IMAGE Options", value: ""},
            {option: "Send this map to Monarch", value: "SendMaptoMonarch"},
            {option: browser.i18n.getMessage("getMapRendering"), value: "getMapRendering"},
            // {option: browser.i18n.getMessage("getMapPreprocessorResponse"), value: "getMapPreprocessorResponse"},
            {option: "Load this map in Tactile Authoring tool", value: "LoadMapInTAT"},
        ];
        mapOptions.forEach((option) => {
            let optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.innerText = option.option;
            selectElement.appendChild(optionElement);
        });

        let selectContainer = document.createElement("div");
        selectContainer.style.display = "none";
        selectContainer.style.marginTop = "1rem";
        selectContainer.style.position = "relative";
        selectElement.style.width = "100%";
        selectContainer.setAttribute("id", "map-select-container");

        selectContainer.appendChild(selectElement);

        selectElement.setAttribute("id", "map-renderer-select");
        selectElement.addEventListener("change", () => {
            //let selectedRenderer = selectElement.options[selectElement.selectedIndex].value;
            console.log("Selected Value", selectElement.value);
            switch(selectElement.value){
                case "getMapRendering":
                    sendMapRequest(port, map, mapType, {toRender: "full"});
                    break;
                case "getMapPreprocessorResponse":
                    sendMapRequest(port, map, mapType, {toRender: "preprocess"});
                    break;
                case "LoadMapInTAT":
                    sendMapRequest(port, map, mapType, {toRender: "full", redirectToTAT: true, sendToMonarch: false});
                    break;
                case "SendMaptoMonarch":
                    sendMapRequest(port, map, mapType, {toRender: "full", redirectToTAT: true, sendToMonarch: true});
                    break;
                default:
                    break;
            }
        });
        selectElement.addEventListener("focus",(event)=> {
            selectElement.selectedIndex = 0;
        });   
        let parentElement = map;
        // handle cases when map(image) is embedded in an anchor tag - necessary to fix the layout
        if (map.parentNode.nodeName.toLowerCase() === "a" ){
            parentElement = parentElement.parentElement;
        }
        parentElement.insertAdjacentElement("afterend", buttonContainer);
        parentElement.insertAdjacentElement("afterend", selectContainer);
        parentElement.parentElement.style.overflow = "visible";
        port.postMessage({
            "type": "handleMapMonarchOptions",
        });
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


function sendMapRequest(port: browser.Runtime.Port, map: HTMLIFrameElement, mapType: MapType, serverOptions: ServerOptions) {
    const serializer = new XMLSerializer();
    let src = map.getAttribute("src");
    let q, lat, lon, zoom;
    //let maptype = "roadmap";
    console.log(src);
    console.debug("Inside sendMapRequest", mapType);
    if(src){
        const mapUrl = new URL(src);
        const searchParams = mapUrl.searchParams;
        /** from the map source extract following params */
        q = searchParams.get("q");
        let latLongStr = searchParams.get("center") || searchParams.get("markers") || searchParams.get("marker");
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
                "toRender": serverOptions.toRender,
                "redirectToTAT": serverOptions.redirectToTAT,
                "sendToMonarch" : serverOptions.sendToMonarch
            });
        } else if (q) { // if we don't have a lat and lon, but we have a query, send a search request
            console.debug("Sending map search request");
            console.debug("q", q);
            port.postMessage({
                "type": "mapSearch",
                "context": map ? serializer.serializeToString(map) : null,
                "placeID": q,
                "toRender": serverOptions.toRender,
                "redirectToTAT": serverOptions.redirectToTAT,
                "sendToMonarch" : serverOptions.sendToMonarch
            });
        }
    } else{
        console.debug("Map Source empty!");
    }
}

function checkMapType(map: HTMLIFrameElement, origin: string): MapType | undefined {
    if (origin == "iframe" && (/google.[\w\.]+\/maps\/embed/.test(map.src))) {
        return MapType.GOOGLE;
    } else if (origin == "staticImage" && (/google.[\w\.]+\/maps\/api/.test(map.src))) {
        return MapType.GOOGLE;
    } else if (origin == "iframe" && (/google.[\w\.]+\/maps\?/.test(map.src))) {
        return MapType.GOOGLE;
    } else if (origin == "iframe" && (/openstreetmap.[\w\.]+\/export/.test(map.src))) {
        return MapType.OPENSTREET;
    }
    return;
}

export function processMaps(document: Document, port: browser.Runtime.Port,  extVersion?: string) {
    Array.from(document.getElementsByTagName("iframe")).forEach((map) => processMap(port, map, "iframe", extVersion));
}

export function processMAPImages(document: Document, port: browser.Runtime.Port, extVersion?: string) {
    Array.from(document.getElementsByTagName("img")).forEach((map) => processMap(port, map, "staticImage", extVersion));
}
