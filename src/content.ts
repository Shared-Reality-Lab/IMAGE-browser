import { browser } from "webextension-polyfill-ts";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();

document.addEventListener("contextmenu", (evt: Event) => {
    selectedElement = evt.target as HTMLElement;
});

port.onMessage.addListener(message => {
    switch (message["type"]) {
        case "resourceRequest":
        case "preprocessRequest":
            const serializer = new XMLSerializer();
            let imageElement: HTMLImageElement;
            if (selectedElement instanceof HTMLImageElement ) {
                imageElement = selectedElement;
            } else {
                imageElement = selectedElement?.querySelector("img") as HTMLImageElement;
            }
            const scheme = imageElement.currentSrc.split(":")[0];
            if (scheme === "http" || scheme === "https") {
                port.postMessage({
                    "type": "resource",
                    "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
                    "dims": [ imageElement.naturalWidth, imageElement.naturalHeight ],
                    "url": window.location.href,
                    "sourceURL": imageElement.currentSrc,
                    "toRender": (message["type"] === "resourceRequest"),
                    "mode": message["mode"]
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

// Process images on page
Array.from(document.getElementsByTagName("img")).forEach(image => {
    if (!image.hasAttribute("tabindex") && !image.closest("a")) {
        image.setAttribute("tabindex", "0");
    }
});
