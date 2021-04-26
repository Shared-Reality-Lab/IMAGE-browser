import { browser } from "webextension-polyfill-ts";

var selectedElement: HTMLElement | null = null;

let port = browser.runtime.connect();

document.addEventListener("contextmenu", (evt: Event) => {
    selectedElement = evt.target as HTMLElement;
});

port.onMessage.addListener(message => {
    switch (message["selection"]) {
        case "mwe-item":
            console.debug(selectedElement);
            fetch("http://bach.cim.mcgill.ca/atp/testpages/tp01/renderings.json").then(resp => {
                return resp.json();
            }).then(json => {
                port.postMessage(json);
            }).catch(err => {
                console.error(err);
            });
            break;
        default:
            break;
    }
    return true;
});
