import { browser, Runtime } from "webextension-polyfill-ts";

let ports: Runtime.Port[] = [];

function handleMessage(message: any) {
    switch (message["type"]) {
        case "resource":
            // Get response and open new window
            let resource = message["resource"] as HTMLElement;
            fetch("https://bach.cim.mcgill.ca/atp/testpages/tp01/renderings.json").then(resp => {
                return resp.json();
            }).then(json => {
                if (json["renderings"].length > 0) {
                    let jsonURIComponent = encodeURIComponent(JSON.stringify(json));
                    browser.windows.create({
                        type: "panel",
                        url: "info/info.html?" + jsonURIComponent
                    });
                } else {
                    throw new Error("Received no renderings from test URL!");
                }
            }).catch(err => {
                console.error(err);
            });
            break;
        default:
            console.debug(message["type"]);
            break;
    }
}

function storeConnection(p: Runtime.Port) {
    let id = p.sender?.tab?.id;
    if (id) {
        ports[id] = p;
        ports[id].onMessage.addListener(handleMessage);
    }
}

browser.runtime.onConnect.addListener(storeConnection);

function onCreated(): void {
    if (browser.runtime.lastError) {
        console.error(browser.runtime.lastError);
    }
}

browser.contextMenus.create({
    id: "mwe-item",
    title: browser.i18n.getMessage("menuItem"),
    contexts: ["image", "link"],
},
onCreated);

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (tab?.id) {
        // Request image from page
        ports[tab.id].postMessage({
            "type": "resourceRequest",
            "tabId": tab.id,
        });
    } else {
        console.error("No tab passed to context menu listener!");
    }
});
