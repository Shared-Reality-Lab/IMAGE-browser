/*
 * Copyright (c) 2021 IMAGE Project, Shared Reality Lab, McGill University
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * and our Additional Terms along with this program.
 * If not, see <https://github.com/Shared-Reality-Lab/IMAGE-browser/LICENSE>.
 */
import browser, { Runtime } from "webextension-polyfill";
import { v4 as uuidv4 } from "uuid";
import { IMAGEResponse} from "./types/response.schema";
import { IMAGERequest } from "./types/request.schema";
import { fromBlob } from 'image-resize-compress';

let ports: Runtime.Port[] = [];
const responseMap: Map<string, IMAGEResponse> = new Map();
var serverUrl : RequestInfo;
var renderingsPanel : browser.Windows.Window;

function getAllStorageSyncData() {
  return browser.storage.sync.get({
    //Default values
    inputUrl: "",
    customServer:false,
    mcgillServer: true,
    developerMode: false,
    previousToggleState:false,
    noHaptics: true,
    haply2diy: false,
    audio: true,
    text: true,
    processItem: "",
    requestItem: "",
    mweItem: ""
  });
}

var renderers : string[] = [];
var graphicUrl : string = "";
async function getRenderers(){
  renderers = [];
  getAllStorageSyncData().then(async items => {
    if(items["audio"]){
      renderers.push("ca.mcgill.a11y.image.renderer.SegmentAudio");
      renderers.push("ca.mcgill.a11y.image.renderer.SimpleAudio");
    }
    if(items["text"]){
      renderers.push("ca.mcgill.a11y.image.renderer.Text");
    }
    if(items["haply2diy"]||true){
      renderers.push("ca.mcgill.a11y.image.renderer.SimpleHaptics");
      renderers.push("ca.mcgill.a11y.image.renderer.PhotoAudioHaptics");
      renderers.push("ca.mcgill.a11y.image.renderer.CSUNHapticsDemo");
    }
  });
}

async function generateQuery(message: { context: string, url: string, dims: [number, number], sourceURL: string }): Promise<IMAGERequest> {
  getRenderers();
  graphicUrl = message.sourceURL
  var graphicWidth:number;
  var graphicHeight:number;
    return fetch(message.sourceURL).then(resp => {
        if (resp.ok) {
          return resp.blob();
        } else {
          throw resp;
        }
    }).then(async(blobFile) => {
      graphicWidth = message.dims[0];
      graphicHeight = message.dims[1];
      if(graphicWidth> 1200 && graphicWidth > graphicHeight){
        message.dims[0] = 1200;
        message.dims[1] = Math.round(graphicHeight*1200/graphicWidth);
        return fromBlob(blobFile, message.dims[0], 'auto', 'webp');
      } else if(graphicHeight > 1200){
        message.dims[0] = Math.round(graphicWidth*1200/graphicHeight);
        message.dims[1] = 1200;
        return fromBlob(blobFile, message.dims[0], 'auto', 'webp');
      } else {
        return blobFile;
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
            "graphic": image,
            "dimensions": message.dims,
            "context": message.context,
            "language": "en",
            "capabilities": [],
            "renderers": renderers
        } as IMAGERequest;
    });
}

async function generateMapQuery(message: { context: string, coordinates: [number, number] }): Promise<IMAGERequest> {
    getRenderers();
    return {
        "request_uuid": uuidv4(),
        "timestamp": Math.round(Date.now() / 1000),
        "coordinates": {
                            "latitude": message.coordinates[0],
                            "longitude": message.coordinates[1]
                        },
        "context": message.context,
        "language": "en",
        "capabilities": [],
        "renderers": renderers
    } as IMAGERequest;
}

async function generateMapSearchQuery(message: { context: string, placeID: string,}): Promise<IMAGERequest> {
  getRenderers();
  return {
      "request_uuid": uuidv4(),
      "timestamp": Math.round(Date.now() / 1000),
      "placeID": message.placeID,
      "context": message.context,
      "language": "en",
      "capabilities": [],
      "renderers": renderers
  } as IMAGERequest;
}

function generateLocalQuery(message: { context: string, dims: [number, number], image: string}): IMAGERequest {
    getRenderers();
    return {
        "request_uuid": uuidv4(),
        "timestamp": Math.round(Date.now() / 1000),
        "graphic": message.image,
        "dimensions": message.dims,
        "context": message.context,
        "language": "en",
        "capabilities": [],
        "renderers": renderers
    } as IMAGERequest;
}

async function generateChartQuery(message: {highChartsData: {[k: string]: unknown}}): Promise<IMAGERequest> {
  getRenderers();
  return {
      "request_uuid": uuidv4(),
      "timestamp": Math.round(Date.now() / 1000),
      "highChartsData": message.highChartsData,
      "language": "en",
      "capabilities": [],
      "renderers": renderers
  } as IMAGERequest;
}

async function handleMessage(p: Runtime.Port, message: any) {
  console.debug("Handling message");
  let query: IMAGERequest;
  switch (message["type"]) {
    case "info":
      const value = responseMap.get(message["request_uuid"]);
      p.postMessage(value);
      responseMap.delete(message["request_uuid"]);
      break;
    case "resource":
    case "localResource":
    case "mapResource":
    case "settingsSaved":
    case "chartResource":
    case "mapSearch":
      // Get response and open new window
      if (message["type"] === "resource") {
        query = await generateQuery(message);
      } else if (message["type"] === "mapResource") {
        console.debug("Generating map query");
        query = await generateMapQuery(message);
      }else if (message["type"] === "mapSearch") {
        console.debug("Generating map query");
        query = await generateMapSearchQuery(message);
      }else if (message["type"] === "chartResource"){
        query = await generateChartQuery(message);
      }else{
        query = generateLocalQuery(message);
      }
      if (message["toRender"] === "full") {
        let audio = new Audio(chrome.runtime.getURL("progressBar/image_request_sent.mp3"));
        audio.play();
        await getAllStorageSyncData().then(async items => {
          if(items["mcgillServer"]===true){
            // serverUrl = "https://image.a11y.mcgill.ca/";
            serverUrl = "https://unicorn.cim.mcgill.ca/image/"
          }else{
            if(items["inputUrl"]!== "" && items["customServer"]===true){
            serverUrl = items["inputUrl"];
            }
          }
          var progressWindow = await browser.windows.create({
              type:"popup",
              url: "progressBar/progressBar.html",
              height: 100,
              width: 400,
          })
          // Value from 0.0 to 1.0
          fetch(serverUrl + "render", {
            "method": "POST",
            "headers": {
              "Content-Type": "application/json"
            },
            "body": JSON.stringify(query)
            }).then(async (resp) => {
              browser.windows.remove(progressWindow.id!)
              if (resp.ok) {
                let completionAudio = new Audio(chrome.runtime.getURL("progressBar/earcon_server_communication_IMAGE_results-arrived.mp3"));
                completionAudio.play();
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
              }).then(async (json: IMAGEResponse) => {
                  if (json["renderings"].length > 0) {
                    if(query["request_uuid"] !== undefined){
                      responseMap.set(query["request_uuid"], json);

                      function createPanel(){
                        return browser.windows.create({
                          type: "panel",
                          url: "info/info.html?uuid=" + query["request_uuid"] + "&" + "graphicUrl="+ graphicUrl

                        })
                      }
                      if(renderingsPanel !== undefined){
                        browser.windows.remove(renderingsPanel.id!)
                        .then(() => createPanel().then((window) => renderingsPanel =  window))
                        .catch(() => createPanel().then((window) => renderingsPanel =  window))
                      }else{
                        await createPanel().then((window) => renderingsPanel = window);
                      }
                      // How to handle if request_uuid was undefined??
                    }
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
        });
      }
      else if (message["toRender"] === "preprocess") {
          await getAllStorageSyncData().then(async items => {
            if(items["mcgillServer"]===true){
              // serverUrl = "https://image.a11y.mcgill.ca/";
              serverUrl ="https://unicorn.cim.mcgill.ca/image/"
            }else{
              if(items["inputUrl"]!== "" && items["customServer"]===true){
              serverUrl = items["inputUrl"];
              }
            }
            browser.downloads.download({
            url: serverUrl + "render/preprocess",
            headers: [{ name: "Content-Type", value: "application/json" }],
            body: JSON.stringify(query),
            method: "POST",
            saveAs: true
          }).catch(err => {
              console.error(err);
          });
       });
      } else if (message["toRender"] === "none") {
        const blob = new Blob([JSON.stringify(query)], { "type": "application/json" });
        const blobURL = URL.createObjectURL(blob);
        browser.downloads.download({
            url: blobURL,
            saveAs: true
        }).catch(err => {
            console.error(err);
        });
      }
      if(message["type"]==="settingsSaved"){
        updateDebugContextMenu();
      }
      break;
    default:
      console.debug(message["type"]);
      break;
  }
}

function updateDebugContextMenu(){
  getAllStorageSyncData().then((items) => {
    showDebugOptions = items["developerMode"];
    previousToggleState = items["previousToggleState"];

    if (showDebugOptions) {
      if(items["processItem"] === "" && items["requestItem"] === ""){
          browser.contextMenus.create({
            id: "preprocess-only",
            title: browser.i18n.getMessage("preprocessItem"),
            contexts: ["image", "link"]
          },
        onCreated);
        browser.contextMenus.create({
          id: "request-only",
          title: browser.i18n.getMessage("requestItem"),
          contexts: ["image", "link"]
        },
        onCreated);
      }

      browser.storage.sync.set({
        previousToggleState : true,
        processItem: "preprocess-only",
        requestItem: "request-only",
      })
    }
    else if(showDebugOptions === false && previousToggleState) {
      browser.contextMenus.remove("preprocess-only");
      browser.contextMenus.remove("request-only");
      browser.storage.sync.set({previousToggleState : false});
      browser.storage.sync.set({
        processItem: "",
        requestItem: "",
      })
    }
  });
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

/*Enable the context menu options*/
function enableContextMenu(){
  browser.contextMenus.update("mwe-item",{ enabled: true });
  if(showDebugOptions){
    browser.contextMenus.update("preprocess-only",{ enabled: true })
    browser.contextMenus.update("request-only",{ enabled: true });
  }
}

/*Disable the context menu options*/
function disableContextMenu(){
  browser.contextMenus.update("mwe-item",{ enabled: false });
  if(showDebugOptions){
    browser.contextMenus.update("preprocess-only",{ enabled: false });
    browser.contextMenus.update("request-only",{ enabled: false });
  }
}

/*Handle the context menu items based on the status of the DOM*/
function handleUpdated(tabId: any, changeInfo: any) {
  if (changeInfo.status == "complete"){
    enableContextMenu();
  }else if (changeInfo.status == "unloaded" || changeInfo.status == "loading"){
    disableContextMenu();
  }
}

/*Handle context menu items based on DOM for the active Tab*/
function getCurrentTabInfo(){
    let currentTab = browser.tabs.query({currentWindow: true, active: true});
    currentTab.then(
        function(tabs){
            handleUpdated(tabs[0].id, tabs[0]);
        },
        function(error){console.log(error)}
    );
}

browser.runtime.onConnect.addListener(storeConnection);
browser.tabs.onUpdated.addListener(handleUpdated);
browser.tabs.onActivated.addListener(getCurrentTabInfo);

function onCreated(): void {
    if (browser.runtime.lastError) {
        console.error(browser.runtime.lastError);
    }
}
browser.contextMenus.create({
    id: "mwe-item",
    title: browser.i18n.getMessage("menuItem"),
    contexts: ["image", "link"]
},
onCreated);
browser.storage.sync.set({
  mweItem:"mwe-item"
})

var showDebugOptions: Boolean;
var previousToggleState: Boolean;

getAllStorageSyncData().then((items) => {
  showDebugOptions = items["developerMode"];
  previousToggleState = items["previousToggleState"];

  if (showDebugOptions) {
      browser.contextMenus.create({
        id: "preprocess-only",
        title: browser.i18n.getMessage("preprocessItem"),
        contexts: ["image", "link"]
      },
      onCreated);
      browser.contextMenus.create({
        id: "request-only",
        title: browser.i18n.getMessage("requestItem"),
        contexts: ["image", "link"]
      },
    onCreated);
    }
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    console.debug(info);
    if (tab?.id) {
        // Request image from page
        if (info.menuItemId === "mwe-item") {
            ports[tab.id].postMessage({
                "type": "resourceRequest",
                "tabId": tab.id,
            });
        } else if (info.menuItemId === "preprocess-only") {
            ports[tab.id].postMessage({
                "type": "preprocessRequest",
                "tabId": tab.id
            });
        } else if (info.menuItemId === "request-only") {
            ports[tab.id].postMessage({
                "type": "onlyRequest",
                "tabId": tab.id
            });
        }
    } else {
      console.error("No tab passed to context menu listener!");
    }
});