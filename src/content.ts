import { browser } from "webextension-polyfill-ts";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();

document.addEventListener("contextmenu", (evt: Event) => {
    selectedElement = evt.target as HTMLElement;
});

port.onMessage.addListener(message => {
    switch (message["type"]) {
        case "resourceRequest":
            port.postMessage({
                "type": "resource",
                "resource": selectedElement?.outerHTML
            });
            break;
        default:
            console.debug(message["type"]);
            break;
    }
    return true;
});
