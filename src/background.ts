import { browser, Runtime } from "webextension-polyfill-ts";
import { v4 as uuidv4 } from "uuid";
import { IMAGEResponse} from "./types/response.schema";
import { IMAGERequest } from "./types/request.schema";

let ports: Runtime.Port[] = [];
const responseMap: Map<string, IMAGEResponse> = new Map();

// TODO Update hard coded values
async function generateQuery(message: { context: string, url: string, dims: [number, number], sourceURL: string }): Promise<IMAGERequest> {
    console.log("generate Query");
    return fetch(message.sourceURL).then(resp => {
        if (resp.ok) {
            return resp.blob();
        } else {
            throw resp;
        }
    }).then(blob => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }).then(image => {
        return {
            "request_uuid": uuidv4(),
            "timestamp": Math.round(Date.now() / 1000),
            "URL": message.url,
            "image": image,
            "dimensions": message.dims,
            "context": message.context,
            "language": "en",
            "capabilities": [],
            "renderers": [
                "ca.mcgill.a11y.image.renderer.Text",
                "ca.mcgill.a11y.image.renderer.SimpleAudio",
                "ca.mcgill.a11y.image.renderer.SegmentAudio"
            ],
        } as IMAGERequest;
    });
}

function generateLocalQuery(message: { context: string, dims: [number, number], image: string}): IMAGERequest {
    console.log("generateLocalQuery");
    return {
        "request_uuid": uuidv4(),
        "timestamp": Math.round(Date.now() / 1000),
        "image": message.image,
        "dimensions": message.dims,
        "context": message.context,
        "language": "en",
        "capabilities": [],
        "renderers": [
            "ca.mcgill.a11y.image.renderer.Text",
            "ca.mcgill.a11y.image.renderer.SimpleAudio"
        ],
    } as IMAGERequest;
}

async function handleMessage(p: Runtime.Port, message: any) {
    let query: IMAGERequest;
    switch (message["type"]) {
        case "info":
            const value = responseMap.get(message["request_uuid"]);
            p.postMessage(value);
            responseMap.delete(message["request_uuid"]);
            break;
        case "resource":
        case "localResource":
            // Get response and open new window
            if (message["type"] === "resource") {
                query = await generateQuery(message);
            } else {
                query = generateLocalQuery(message);
            }
            if (message["toRender"] === true) {
                fetch("https://image.a11y.mcgill.ca/render", {
                        "method": "POST",
                        "headers": {
                            "Content-Type": "application/json"
                        },
                        "body": JSON.stringify(query)
                }).then(async (resp) => {
                    if (resp.ok) {
                        return resp.json();
                    } else {
                        browser.windows.create({
                            type: "panel",
                            url: "errors/http_error.html"
                        });
                        console.error(`HTTP Error ${resp.status}: ${resp.statusText}`);
                        const textContent = await resp.text();
                        console.error(textContent);
                        throw new Error(textContent);
                    }
                }).then((json: IMAGEResponse) => {
                    if (json["renderings"].length > 0) {
                        responseMap.set(query["request_uuid"], json);
                        browser.windows.create({
                            type: "panel",
                            url: message["mode"] == "audio" ? "info/info.html?" + query["request_uuid"]
                                                            : "info/hapticInfo.html?" + query["request_uuid"]
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
            } else {
                browser.downloads.download({
                    url: "https://image.a11y.mcgill.ca/render/preprocess",
                    headers: [{ name: "Content-Type", value: "application/json" }],
                    body: JSON.stringify(query),
                    method: "POST",
                    saveAs: true
                }).catch(err => {
                    console.error(err);
                });
            }
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
        ports[id].onMessage.addListener(handleMessage.bind(null, p));
        ports[id].onDisconnect.addListener((p: Runtime.Port) => {
            const idx = ports.indexOf(p);
            if (idx >= 0) {
                ports.splice(idx, 1);
            }
        });
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
    title: browser.i18n.getMessage("menuAudioItem"),
    contexts: ["image", "link"],
},
onCreated);
browser.contextMenus.create({
    id: "haptic-item",
    title: browser.i18n.getMessage("menuHapticItem"),
    contexts: ["image", "link"]
},
onCreated);
browser.contextMenus.create({
    id: "preprocess-only",
    title: browser.i18n.getMessage("preprocessItem"),
    contexts: ["image", "link"]
},
onCreated);

browser.contextMenus.onClicked.addListener((info, tab) => {
    console.debug(info);
    if (tab?.id) {
        // Request image from page
        if (info.menuItemId === "mwe-item") {
            ports[tab.id].postMessage({
                "type": "resourceRequest",
                "tabId": tab.id,
                "mode": "audio"
            });
        } else if (info.menuItemId === "haptic-item") {
            ports[tab.id].postMessage({
                "type": "resourceRequest",
                "tabId": tab.id,
                "mode": "haptic"
            });
        } else if (info.menuItemId === "preprocess-only") {
            ports[tab.id].postMessage({
                "type": "preprocessRequest",
                "tabId": tab.id
            });
        }
    } else {
        console.error("No tab passed to context menu listener!");
    }
});
