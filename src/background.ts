import { browser, Runtime } from "webextension-polyfill-ts";
import { v4 as uuidv4 } from "uuid";
import { IMAGEResponse} from "./types/response.schema";
import { IMAGERequest } from "./types/request.schema";

let ports: Runtime.Port[] = [];

// TODO Update hard coded values
function generateQuery(message: { context: string, image: string, url: string }): IMAGERequest {
    return {
        "request_uuid": uuidv4(),
        "timestamp": Math.round(Date.now() / 1000),
        "URL": message.url,
        "image": message.image,
        "context": message.context,
        "language": "en",
        "capabilities": [],
        "renderers": [
            "ca.mcgill.cim.bach.atp.renderer.Text",
            "ca.mcgill.cim.bach.atp.renderer.SimpleAudio"
        ],
    };
}

function handleMessage(message: any) {
    switch (message["type"]) {
        case "resource":
            // Get response and open new window
            const query = generateQuery(message);
            console.debug(query);
            fetch("https://bach.cim.mcgill.ca/atp/render", {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": JSON.stringify(query)
            }).then(resp => {
                return resp.json();
            }).then((json: IMAGEResponse) => {
                if (json["renderings"].length > 0) {
                    window.localStorage.setItem(query["request_uuid"], JSON.stringify(json));
                    browser.windows.create({
                        type: "panel",
                        url: "info/info.html?" + query["request_uuid"]
                    });
                } else {
                    browser.windows.create({
                        type: "panel",
                        url: "errors/no_renderings.html"
                    });
                    // throw new Error("Received no renderings from test URL!");
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
