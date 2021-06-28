import { browser } from "webextension-polyfill-ts";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();

document.addEventListener("contextmenu", (evt: Event) => {
    selectedElement = evt.target as HTMLElement;
});

port.onMessage.addListener(message => {
    switch (message["type"]) {
        case "resourceRequest":
            const serializer = new XMLSerializer();
            let imageElement: HTMLImageElement;
            if (selectedElement instanceof HTMLImageElement ) {
                imageElement = selectedElement;
            } else {
                imageElement = selectedElement?.querySelector("img") as HTMLImageElement;
            }

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            //canvas.width = imageElement.width;
            //canvas.height = imageElement.height;
            // Fix for #30
            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;
            console.debug(imageElement.naturalWidth);
            // Fix for #30, specify size and use lossy format
            ctx?.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
            const data = canvas.toDataURL("image/jpeg");
            console.debug(data);

            port.postMessage({
                "type": "resource",
                "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
                "image": data,
                "dims": [ canvas.width, canvas.height ],
                "url": window.location.href
            });
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
