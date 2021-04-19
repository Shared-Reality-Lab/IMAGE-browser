import { browser } from "webextension-polyfill-ts";

let ports = [];

function storeConnection(p: Port) {
    ports[p.sender.tab.id] = p;
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
    ports[tab.id].postMessage({
        "selection": info.menuItemId,
        "tabId": tab.id
    });
});
