import { browser } from "webextension-polyfill-ts";

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
    fetch("http://cim.mcgill.ca/~jeffbl/atp/tp01/renderings.json").then(resp => {
        return resp.json();
    }).then(json => {
        browser.tabs.sendMessage(tab.id, {
            "selection": info.menuItemId,
            "response": json
        });
    }).catch(err => {
        console.error(err);
    });
});
