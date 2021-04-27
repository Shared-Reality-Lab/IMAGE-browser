import { browser, Runtime } from "webextension-polyfill-ts";

let ports: Runtime.Port[] = [];

function handleMessage(message: any) {
    console.debug(message);
    if (message["renderings"].length > 0) {
        let jsonURIComp = encodeURIComponent(JSON.stringify(message));
        browser.windows.create({
            type: "detached_panel",
            url: "info/info.html?" + jsonURIComp
        });
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
        ports[tab.id].postMessage({
            "selection": info.menuItemId,
            "tabId": tab.id
        });
    } else {
        console.error("No tab passed to context menu listener!");
    }
});
