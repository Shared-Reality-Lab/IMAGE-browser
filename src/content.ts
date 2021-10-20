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
            let imageElement: HTMLImageElement;
            if (selectedElement instanceof HTMLImageElement ) {
                imageElement = selectedElement;
            } else {
                imageElement = selectedElement?.querySelector("img") as HTMLImageElement;
            }
            console.debug(imageElement.currentSrc);
            console.debug(port);
            const scheme = imageElement.currentSrc.split(":")[0];
            if (scheme === "http" || scheme === "https") {
                port.postMessage({
                    "type": "resource",
                    "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
                    "dims": [ imageElement.naturalWidth, imageElement.naturalHeight ],
                    "url": window.location.href,
                    "sourceURL": imageElement.currentSrc,
                    "toRender": (message["type"] === "resourceRequest")
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
        case "preprocessMap":
            let mapElement: HTMLIFrameElement;
            if (selectedElement instanceof HTMLIFrameElement) {
                mapElement = selectedElement;
            } else {
                mapElement = selectedElement?.querySelector("iframe") as HTMLIFrameElement;
            }
            console.debug(mapElement.src);

            let src = mapElement.getAttribute("src");
            let q, lat, lon, zoom;
            let maptype = "roadmap";
            if(src?.includes("&q=")){
               let i1 = src.indexOf("&q=") + 3;
               let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1);
               q = src.substring(i1, i2);
            }
            if(src?.includes("&center=")){
                let i1 = src.indexOf("&center=") + 8;
                let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1);
                let center = src.substring(i1, i2);
                lat = center.split(",")[0];
                lon = center.split(",")[1];
            }
            if(src?.includes("&zoom=")){
                let i1 = src.indexOf("&zoom=") + 6;
                let i2 = src.indexOf("&", i1) == -1 ? src.length : src.indexOf("&", i1);
                zoom = src.substring(i1, i2);
            }
            if(src?.includes("&maptype=satellite")){
                maptype = "satellite";
            }
            if(lat && lon){
                port.postMessage({
                    "type": "resource",
                    "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
                    "coordinates": {
                        "latitude": lat,
                        "longitude": lon
                    },
                    "url": window.location.href,
                    "toRender": (message["type"] === "resourceRequest")
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
Array.from(document.getElementsByTagName("iframe")).forEach(map => {
    if (!map.hasAttribute("tabindex") && !map.closest("a")) {
        if (map.hasAttribute("src") && map.src.includes("google.com/maps")) {
            map.setAttribute("tabindex", "0");
        }
    }
});
