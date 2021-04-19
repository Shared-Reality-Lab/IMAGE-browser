import { browser } from "webextension-polyfill-ts";

var selectedElement: HTMLElement = null;

document.addEventListener("contextmenu", (evt) => {
    selectedElement = evt.target;
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message["selection"]) {
        case "mwe-item":
            console.debug(selectedElement);
            fetch("http://cim.mcgill.ca/~jeffbl/atp/tp01/renderings.json").then(resp => {
                return resp.json();
            }).then(json => {
                console.debug(json);
            }).catch(err => {
                console.error(err);
            });
            break;
        default:
            break;
    }
    return true;
});
