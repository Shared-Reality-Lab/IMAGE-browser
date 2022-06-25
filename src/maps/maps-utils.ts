import browser from "webextension-polyfill";
import { IMAGERequest } from "../types/request.schema";
import { getRenderers } from "../utils";
import { v4 as uuidv4 } from "uuid";

export function processIMAGEMaps(document: Document, port: browser.Runtime.Port){
    Array.from(document.getElementsByTagName("iframe")).forEach(map => {
        if (!map.hasAttribute("tabindex") && !map.closest("a")) {
            if (map.hasAttribute("src") && map.src.includes("google.com/maps")) {
                map.setAttribute("tabindex", "0");
                let map_button = document.createElement("button");
                map_button.innerText = browser.i18n.getMessage("getMapRendering");
                // Get all the information about our found map and store the info. Then create a button to render the map
                map_button.addEventListener("click", () => {
                    const serializer = new XMLSerializer();
                    let src = map.getAttribute("src");
                    let q, lat, lon, zoom;
                    let maptype = "roadmap";
                    if(src?.includes("&q=")){ // assume src is not null and then look for a query string
                       let i1 = src.indexOf("&q=") + 3;
                       let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1); // query either goes to the end or there is another header
                       q = src.substring(i1, i2);
                    }
                    if(src?.includes("&center=")){ // try to find center of map
                        let i1 = src.indexOf("&center=") + 8;
                        let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1);
                        let center = src.substring(i1, i2);
                        lat = center.split(",")[0];
                        lon = center.split(",")[1];
                    }
                    if(src?.includes("&zoom=")){ // try to find zoom of map
                        let i1 = src.indexOf("&zoom=") + 6;
                        let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1);
                        zoom = src.substring(i1, i2);
                    }
                    if(src?.includes("&maptype=satellite")){ // only important map type right now is satellite
                        maptype = "satellite";
                    }
                    if(lat && lon){ // only send the resource request if we have a lat and lon
                        console.debug("Sending map resource request");
                        port.postMessage({
                            "type": "mapResource",
                            "context": map ? serializer.serializeToString(map) : null,
                            "coordinates": [parseFloat(lat), parseFloat(lon)],
                            "toRender": "full"
                        });
                    }else if(q){ // if we don't have a lat and lon, but we have a query, send a search request
                        console.debug("Sending map search request");
                        port.postMessage({
                            "type": "mapSearch",
                            "context": map ? serializer.serializeToString(map) : null,
                            "placeID": q,
                            "toRender": "full"
                        });
                    }
                });
                map_button.setAttribute("tabindex", "0");
                map.insertAdjacentElement("afterend", map_button);
            }
        }
    });
}

export async function generateMapQuery(message: { context: string, coordinates: [number, number] }): Promise<IMAGERequest> {
    let renderers = await getRenderers();
    return {
        "request_uuid": uuidv4(),
        "timestamp": Math.round(Date.now() / 1000),
        "coordinates": {
                            "latitude": message.coordinates[0],
                            "longitude": message.coordinates[1]
                        },
        "context": message.context,
        "language": "en",
        "capabilities": [],
        "renderers": renderers
    } as IMAGERequest;
}

export async function generateMapSearchQuery(message: { context: string, placeID: string,}): Promise<IMAGERequest> {
  let renderers = await getRenderers();
  return {
      "request_uuid": uuidv4(),
      "timestamp": Math.round(Date.now() / 1000),
      "placeID": message.placeID,
      "context": message.context,
      "language": "en",
      "capabilities": [],
      "renderers": renderers
  } as IMAGERequest;
}