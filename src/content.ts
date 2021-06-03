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
            imageElement.setAttribute("crossorigin", "anonymous");

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;
            ctx?.drawImage(imageElement, 0, 0);
            const data = canvas.toDataURL();

            port.postMessage({
                "type": "resource",
                "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
                "image": data,
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
