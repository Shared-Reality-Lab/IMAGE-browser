import { browser } from "webextension-polyfill-ts";

var selectedElement: HTMLElement = null;

document.addEventListener("contextmenu", (evt) => {
    selectedElement = evt.target;
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message["selection"]) {
        case "mwe-item":
            console.debug(selectedElement);
            console.debug(message["response"]);
            break;
        default:
            break;
    }
    return true;
});
