import browser from "webextension-polyfill";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();

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
            if (scheme === "http" || scheme === "https") {
                port.postMessage({
                    "type": "resource",
                    "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
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
                        "toRender": (message["type"] === "resourceRequest")
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

console.log("hello");
// Process images on page
Array.from(document.getElementsByTagName("img")).forEach(image => {
    if (!image.hasAttribute("tabindex") && !image.closest("a")) {
        image.setAttribute("tabindex", "0");
    }
});
// regex to find source urls for embedded google maps
const googleMapRegex = /https:\/\/www.google.com\/maps\/embed\?/;
// regex to find source urls from google maps
const map_regex = /src="(https:\/\/maps\.googleapis\.com\/maps\/api\/staticmap)"/g;
//https://maps.google.com/maps/api/staticmap?&channel=ta.desktop.restaurant_review&zoom=15&size=347x137&scale=1&client=gme-tripadvisorinc&format=jpg&sensor=false&language=en_CA&center=45.524441,-73.575737&maptype=roadmap&&markers=icon:http%3A%2F%2Fc1.tacdn.com%2F%2Fimg2%2Fmaps%2Ficons%2Fcomponent_map_pins_v1%2FR_Pin_Small.png|45.524441,-73.575737&signature=kq0D9vxdXPGUoWK8iXw3JvStp14=
// Process maps on page
Array.from(document.getElementsByTagName("iframe")).forEach(map => {
    console.info("world");
    if (!map.hasAttribute("tabindex") && !map.closest("a")) {
        // Get list of matches for regex in map
        const matches = googleMapRegex.exec(map.src);
        console.info(matches);
        console.info("hello");
        if (matches!=null) {
            map.setAttribute("tabindex", "0");     
            let map_button = document.createElement("button");
            map_button.innerText = "Render Map";
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
                        "url": window.location.href,
                        "toRender": false
                    });
                }
            });
            map_button.setAttribute("tabindex", "0");
            map.insertAdjacentElement("afterend", map_button);
        }
    }
});
