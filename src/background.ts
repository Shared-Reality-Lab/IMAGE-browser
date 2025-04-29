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
import hash from "object-hash";
import { IMAGEResponse } from "./types/response.schema";
import { IMAGERequest } from "./types/request.schema";
import { getAllStorageSyncData, getCapabilities, getRenderers, getLanguage, windowsPanel } from './utils';
import { generateMapQuery, generateMapSearchQuery } from "./maps/maps-utils";
import { RENDERERS, SERVER_URL } from './config';
import { encryptData, monarchPopUp, decryptData, saveToLocalStorage } from "./monarch/utils";
import { TatStorageData } from "./monarch/types";

let ports: { [key: number]: Runtime.Port } = {};
const responseMap: Map<string, { server: RequestInfo, response: IMAGEResponse, request: IMAGERequest }> = new Map();
var serverUrl: RequestInfo;
var renderingsPanel: browser.Windows.Window | browser.Tabs.Tab;
let launchPad : browser.Windows.Window | browser.Tabs.Tab;
var graphicUrl: string = "";
var extVersion = process.env.NODE_ENV;
//console.debug("Extension Version background page", extVersion);
//console.debug("Suffix Text", process.env.SUFFIX_TEXT);
async function generateQuery(message: { context: string, url: string, dims: [number, number], graphicBlob: string }): Promise<IMAGERequest> {
  let renderers = await getRenderers();
  let capabilities = await getCapabilities();
  console.debug("inside generate query");
  return {
    "request_uuid": uuidv4(),
    "timestamp": Math.round(Date.now() / 1000),
    "URL": message.url,
    "graphic": message.graphicBlob,
    "dimensions": message.dims,
    "context": message.context,
    "language": await getLanguage(),
    "capabilities": capabilities,
    "renderers": renderers
  } as IMAGERequest;
}

async function generateLocalQuery(message: { context: string, dims: [number, number], image: string, graphicBlob: string }): Promise<IMAGERequest> {
  let renderers = await getRenderers();
  let capabilities = await getCapabilities();
  return {
    "request_uuid": uuidv4(),
    "timestamp": Math.round(Date.now() / 1000),
    "graphic": message.graphicBlob,
    "dimensions": message.dims,
    "context": message.context,
    "language": await getLanguage(),
    "capabilities": capabilities,
    "renderers": renderers
  } as IMAGERequest;
}

async function generateChartQuery(message: { highChartsData: { [k: string]: unknown } }): Promise<IMAGERequest> {
  let renderers = await getRenderers();
  let capabilities = await getCapabilities();
  return {
    "request_uuid": uuidv4(),
    "timestamp": Math.round(Date.now() / 1000),
    "highChartsData": message.highChartsData,
    "language": await getLanguage(),
    "capabilities": capabilities,
    "renderers": renderers
  } as IMAGERequest;
}

async function handleMessage(p: Runtime.Port, message: any) {
  console.debug("Handling message", message);
  let query: IMAGERequest | undefined;
  graphicUrl = message["sourceURL"];
  switch (message["type"]) {
    case "info":
      const value = responseMap.get(message["request_uuid"]);
      p.postMessage(value);
      responseMap.delete(message["request_uuid"]);
      break;
    case "resource":
      query = await generateQuery(message);
      break;
    case "localResource":
      query = await generateLocalQuery(message);
      break;
    case "mapResource":
      console.debug("Generating map query");
      query = await generateMapQuery(message);
      break;
    case "settingsSaved":
      await updateDebugContextMenu();
      break;
    case "chartResource":
      query = await generateChartQuery(message);
      break;
    case "mapSearch":
      console.debug("Generating map query");
      query = await generateMapSearchQuery(message);
      break;
    case "dataFromAuthoringTool":
      console.debug("Data received from Authoring Tool");
      let items = await getAllStorageSyncData();
      const encryptionKey = items["monarchEncryptionKey"];
      const [title, channelId, secretKey] = await Promise.all([
        decryptData(message.storageData.graphicTitle, encryptionKey), 
        decryptData(message.storageData.channelId, encryptionKey), 
        decryptData(message.storageData.secretKey, encryptionKey)
      ]);
      //console.log("Decrypted Data", title, channelId, secretKey);
      await browser.storage.sync.set({
        monarchTitle: title,
        monarchChannelId: channelId,
        monarchSecretKey: secretKey
      });
      break;
    case "checkImageSize":
      console.debug("Checking Image Size");
      let blob = await fetch(message["sourceURL"]).then(r => r.blob());
      const blobFile = new File([blob], "buffer.jpg", { type: blob.type });
      const sizeMb = blobFile.size / 1024 / 1024;
      console.debug(`originalFile size ${sizeMb} MB`);
      if (sizeMb > 4) {
        console.debug(`Compressing Image to make it less than 4MB`);
        const graphicBlobStr = await blobToBase64(blob);
        /** compress image using external library in content script*/
        let tabs = browser.tabs.query({ active: true, currentWindow: true });
        tabs.then(async function (tabs) {
          let currentTab = tabs[0];
          //console.debug("current Tab", currentTab);
          if (currentTab.id) {

            ports[currentTab.id].postMessage({
              "type": "compressImage",
              "tabId": currentTab.id,
              "graphicBlobStr": graphicBlobStr,
              "blobType": blob.type
            });
            // browser.tabs.sendMessage(currentTab.id, { "type": "compressImage", "blob": blob });
          }
        });
        return;
      }
      else {
        const graphicBlobStr = await blobToBase64(blob);
        message["graphicBlob"] = graphicBlobStr;
        query = await generateQuery(message);
      }
      break;
    case "handleMapMonarchOptions": {
      console.debug("Handling map monarch options");
      getCurrentTabInfo();
    }
    default:
      console.debug(message["type"]);
  }
  if (query) {
    console.debug("Value of toRender ", message["toRender"]);
    switch (message["toRender"]) {
      case "full":
        {
          let items = await getAllStorageSyncData();
          if (items["mcgillServer"] === true) {
            serverUrl = SERVER_URL;
          } else {
            if (items["inputUrl"] !== "" && items["customServer"] === true) {
              serverUrl = items["inputUrl"];
            }
          }
          var progressWindow = windowsPanel ? await browser.windows.create({
            type: "popup",
            url: "progressBar/progressBar.html",
            height: 100,
            width: 400,
          }) : await browser.tabs.create({
            url: "progressBar/progressBar.html",
          });
          let resp: Response;
          let json: IMAGEResponse = { "request_uuid": "", "timestamp": 0, "renderings": [] };
          try {
            resp = await fetch(serverUrl + "render", {
              "method": "POST",
              "headers": {
                "Content-Type": "application/json"
              },
              "body": JSON.stringify(query)
            });
            windowsPanel ? browser.windows.remove(progressWindow.id!) : browser.tabs.remove(progressWindow.id!);
            if (resp.ok) {
              json = await resp.json();
            } else {
              windowsPanel ? browser.windows.create({
                type: "panel",
                url: "errors/http_error.html"
              }) : browser.tabs.create({
                url: "errors/http_error.html",
              });
              console.error(`HTTP Error ${resp.status}: ${resp.statusText}`);
              const textContent = await resp.text();
              console.error(textContent);
              throw new Error(textContent);
            }
          } catch {
            windowsPanel ? browser.windows.remove(progressWindow.id!) : browser.tabs.remove(progressWindow.id!);
            windowsPanel ? browser.windows.create({
              type: "panel",
              url: "errors/http_error.html"
            }) : browser.tabs.create({
              url: "errors/http_error.html",
            });
            return;
          }
          if (json["renderings"].length > 0) {
            console.log("Inside JSON Renderings");
            console.log("message", message);
            if (message["redirectToTAT"]) {
              console.log("Received TAT data in background script");
              let tactileResponse = json.renderings.filter((rendering) => (rendering.type_id == RENDERERS.tactileSvg))
              let tactileSvgGraphic = tactileResponse[0].data.graphic as string;
              //console.log("Tactile Response", tactileSvgGraphic);
              let encodedSvg = tactileSvgGraphic.split("data:image/svg+xml;base64,")[1];
              let svgDom = atob(encodedSvg);
              let reqTitle = items["monarchTitle"];
              let reqSecretKey = items["monarchSecretKey"];
              let reqChannelId = items["monarchChannelId"];
              let encryptionKey = items["monarchEncryptionKey"];
              const flowType = reqChannelId ? "update" : "create";
              let monarchTargetUrl = items["mcgillServer"] ? `${SERVER_URL}image/monarch` : `${serverUrl}monarch`;
              let monarchFetchUrl = flowType == "update" ?
                `${monarchTargetUrl}/update/${reqChannelId}` :
                `${monarchTargetUrl}/create`;
              let encryptedGraphicBlob = query["graphic"] && await encryptData(query["graphic"], encryptionKey);
              let encryptedCoordinates = query["coordinates"] && await encryptData(JSON.stringify(query["coordinates"]), encryptionKey);
              let encryptedPlaceId = query["placeID"] && await encryptData(query["placeID"], encryptionKey);
              const reqData = await encryptData(svgDom, encryptionKey);
              const reqBody = {
                "data": reqData,
                "layer": "None",
                "title": reqTitle,
                "secret": reqSecretKey,
                "graphicBlob": encryptedGraphicBlob,
                "coordinates": encryptedCoordinates,
                "placeID": encryptedPlaceId
              };
              
              if (message["sendToMonarch"]) {
                /** Send Graphic to Monarch flow - Make curl request to monarch */
                const response = await fetch(monarchFetchUrl,
                  {
                    "method": "POST",
                    "headers": {
                      "Content-Type": "application/json"
                    },
                    "body": JSON.stringify(reqBody)
                  });

                let responseJSON = {
                  "id": reqChannelId || "",
                  "secret": ""
                };
                //console.log("header", response.headers.get("Content-Type"));
                if (flowType == "create") {
                  responseJSON = await response.json();
                  browser.storage.sync.set({
                    "monarchChannelId": responseJSON["id"],
                    "monarchSecretKey": responseJSON["secret"]
                  });
                }
                //console.log("response received", responseJSON);
                let currentTab = await browser.tabs.query({ active: true, currentWindow: true });
                browser.scripting.executeScript({
                  target: { tabId: currentTab[0].id || 0 },
                  func: monarchPopUp,
                  args: [responseJSON["id"], flowType]
                });

              } else {
                /** Handle "Load in Tactile Authoring Tool" flow */
                const tatStorageData: TatStorageData = {
                  channelId: items["monarchChannelId"],
                  graphicTitle: items["monarchTitle"],
                  secretKey: items["monarchSecretKey"],
                  graphicBlob: query["graphic"],
                  coordinates: query["coordinates"] && JSON.stringify(query["coordinates"]),
                  placeID: query["placeID"],
                }
                //console.log("Svg Dom Value", svgDom);
                let tatTargetUrl = items["mcgillServer"] ? `${SERVER_URL}image/tat/` : `${serverUrl}tat/`;
                let tabs = await browser.tabs.query({ url: tatTargetUrl });
                // if(tabs){
                //   tabs.forEach((tab)=>{
                //     if(tab.id){browser.tabs.remove(tab.id)}
                //   })
                // }
                /** encrypt data before storing in local storage */
                let encryptedSvgData = await encryptData(svgDom, encryptionKey);
                let encryptedTatData: TatStorageData = {channelId:"", graphicTitle:"", secretKey:""};
                for (let key of Object.keys(tatStorageData)) {
                  let stringToEncrypt = tatStorageData[key as keyof TatStorageData];
                  if (stringToEncrypt){
                    encryptedTatData[key as keyof TatStorageData] = await encryptData(tatStorageData[key as keyof TatStorageData], encryptionKey);
                  }
                }
                // let encryptedTatData = await Promise.all(Object.keys(tatStorageData).map(async (tatKey)=>{
                //   return await encryptData(tatStorageData[tatKey as keyof TatStorageData], encryptionKey);
                // }))
                if (tabs && tabs.length > 0) {
                  let existingTab = tabs[0];
                  browser.scripting.executeScript({
                    target: { tabId: existingTab.id || 0 },
                    func: saveToLocalStorage,
                    args: [encryptedSvgData, encryptedTatData, existingTab]
                  });
                  browser.tabs.update(existingTab.id, { active: true });
                }
                else {
                  let authoringTool = browser.tabs.create({
                    url: tatTargetUrl
                  });
                  authoringTool.then((tab) => {
                    browser.scripting.executeScript({
                      target: { tabId: tab.id || 0 },
                      func: saveToLocalStorage,
                      args: [encryptedSvgData, encryptedTatData]
                    });
                  }, (error) => { console.log(error) });
                }
              }

            }
            else {
              if (query["request_uuid"] !== undefined) {
                responseMap.set(query["request_uuid"],
                  { "response": json, "request": query, "server": serverUrl }
                );
                if (renderingsPanel !== undefined) {
                  try {
                    await windowsPanel ? browser.windows.remove(renderingsPanel.id!) : browser.tabs.remove(renderingsPanel.id!);
                    renderingsPanel = await createPanel(query);
                  } catch {
                    renderingsPanel = await createPanel(query);
                  }
                } else {
                  renderingsPanel = await createPanel(query);
                }
                // How to handle if request_uuid was undefined??
              }
            }
          } else {
            await windowsPanel ? browser.windows.create({
              type: "panel",
              url: 'errors/no_renderings.html?uuid=' +
                encodeURIComponent((query['request_uuid'] || '')) + "&hash=" +
                encodeURIComponent(hash(query)) + "&serverURL=" +
                encodeURIComponent(serverUrl.toString())
            }) : browser.tabs.create({
              url: 'errors/no_renderings.html?uuid=' +
                encodeURIComponent((query['request_uuid'] || '')) + "&hash=" +
                encodeURIComponent(hash(query)) + "&serverURL=" +
                encodeURIComponent(serverUrl.toString())
            });
          }
        }
        break;

      case "preprocess":
        {
          let items = await getAllStorageSyncData();
          if (items["mcgillServer"] === true) {
            serverUrl = SERVER_URL;
          } else {
            if (items["inputUrl"] !== "" && items["customServer"] === true) {
              serverUrl = items["inputUrl"];
            }
          }
          try {
            await browser.downloads.download({
              url: serverUrl + "render/preprocess",
              headers: [{ name: "Content-Type", value: "application/json" }],
              body: JSON.stringify(query),
              method: "POST",
              saveAs: true
            })
          } catch (err) {
            console.error(err);
          }
        }
        break;
      case "none":
        {
          try {
            await browser.downloads.download({
              url: `data:application/json;base64,${btoa(JSON.stringify(query))}`,
              saveAs: true,
              filename: `${query['request_uuid']}.json`
            });
          } catch (err) {
            console.error(err);
          }
        }
        break;
    }
  }
}
function blobToBase64(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

async function createOffscreen() {
  // @ts-ignore
  await browser.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'keep service worker running',
  }).catch(() => { });
}
//browser.runtime.onInstalled.addListener(() => {createOffscreen();});
browser.runtime.onStartup.addListener(() => { createOffscreen(); });
// a message from an offscreen document every 50 second resets the inactivity timer
browser.runtime.onMessage.addListener(msg => {
  if (msg.keepAlive) console.debug('keepAlive');
});


async function updateDebugContextMenu() {
  let items = await getAllStorageSyncData();
  //console.log("Saved Items", items);
  showDebugOptions = items["developerMode"];
  monarchEnabled = items["monarchEnabled"];
  // previous toggle state keeps track of the previous state of the developer mode
  previousToggleState = items["previousToggleState"];
  // previousMonarchToggle keeps track of the previous state of the monarch mode
  previousMonarchMode = items["previousMonarchMode"];
  displayInvisibleButtons = items["displayInvisibleButtons"];
  let tabs = browser.tabs.query({})
  //console.log("inside Background new code", displayInvisibleButtons)

  // handleInvisibleButtons based on the value of displayInvisibleButtons in storag
  tabs.then(function (tabs) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].url && !tabs[i].url?.startsWith("chrome://") && tabs[i].id) {
        let tabId = tabs[i].id || 0;  
        if(ports[tabId]){
          ports[tabId].postMessage({
            "type": "handleInvisibleButton",
            "displayInvisibleButtons": displayInvisibleButtons
          });
        }
      }
    }
  });
  
  // handle context menu items based on the value of showDebugOptions
  if (showDebugOptions) {

    if (items["processItem"] === "" && items["requestItem"] === "") {
      browser.contextMenus.create({
        id: "preprocess-only",
        title: (extVersion == 'development') ? (browser.i18n.getMessage("preprocessItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
        contexts: ["image"]
      }, onCreated);
      browser.contextMenus.create({
        id: "request-only",
        title: (extVersion == 'development') ? (browser.i18n.getMessage("requestItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("requestItem"),
        contexts: ["image"]
      }, onCreated);
    }

    browser.storage.sync.set({
      previousToggleState: true,
      processItem: "preprocess-only",
      requestItem: "request-only",
    })
  }
  // if the developer mode is disabled, remove the context menu items
  else if (showDebugOptions === false && previousToggleState) {
    browser.contextMenus.remove("preprocess-only");
    browser.contextMenus.remove("request-only");

    browser.storage.sync.set({ previousToggleState: false });
    browser.storage.sync.set({
      processItem: "",
      requestItem: "",
    });
  }
  // handle monarchItems based on the value of monarchEnabled in storage
  if (monarchEnabled) {
    // set toggleMonarch options in storage
    browser.storage.sync.set({
      previousMonarchMode: true,
    })
    // monarchOptions for image
    browser.contextMenus.create({ id: "mwe-item-tat", title: "Load in Tactile Authoring Tool", contexts: ["image"]}, onCreated);
    browser.contextMenus.create({ id: "mwe-item-monarch", title: "Send Graphic to Monarch", contexts: ["image"]}, onCreated);
  } else if(!monarchEnabled && previousMonarchMode) {
    browser.storage.sync.set({
      previousMonarchMode: false,
    })
    browser.contextMenus.remove("mwe-item-tat");
    browser.contextMenus.remove("mwe-item-monarch");
  }
  tabs.then(function (tabs) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].url && !tabs[i].url?.startsWith("chrome://")) {
        browser.scripting.executeScript({
          target: { tabId: tabs[i].id || 0 }, 
          func: toggleMapOptions,
          args: [showDebugOptions, monarchEnabled]
        });
      }
    }
  }, function () { });
}

function toggleMapOptions(showDebugOptions: Boolean, monarchEnabled: Boolean) {
    let mapButtonContainer = document.getElementById("map-button-container");
    let mapSelectContainer = document.getElementById("map-select-container");
    if (mapButtonContainer && mapSelectContainer) {
      if (monarchEnabled) {
        mapSelectContainer.style.display = "flex";
        mapButtonContainer.style.display = "none";
      } else {
        mapSelectContainer.style.display = "none";
        mapButtonContainer.style.display = "flex";
      }
    }
};

function storeConnection(p: Runtime.Port) {
  //console.debug("store Connection");
  let id = p.sender?.tab?.id;
  if (id) {
    ports[id] = p;
    ports[id].onMessage.addListener(handleMessage.bind(null, p));
    const pingInterval = setInterval((id:any) => {
      //console.debug("Ping to port with Id "+ id);
      if(ports[id]){
        ports[id].postMessage({
          status: "ping",
        }); 
      }
    }, 30000, id);
    ports[id].onDisconnect.addListener((p: Runtime.Port) => {
      clearInterval(pingInterval);
      if (id) {
        delete ports[id];
      }
    });
  }
  //console.debug("Store Connection ports", ports);
}

/*Enable the context menu options*/
function enableContextMenu() {
  browser.contextMenus.update("mwe-item", {
    enabled: true,
    title: (extVersion == 'development') ? (browser.i18n.getMessage("menuItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("menuItem")
  });
  if (showDebugOptions) {
    browser.contextMenus.update("preprocess-only", {
      enabled: true,
      title: (extVersion == 'development') ? (browser.i18n.getMessage("preprocessItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
    })
    browser.contextMenus.update("request-only", {
      enabled: true,
      title: (extVersion == 'development') ? (browser.i18n.getMessage("requestItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("requestItem"),
    });
  } if(monarchEnabled){
    browser.contextMenus.update("mwe-item-tat", {
      enabled: true,
      title: "Load in Tactile Authoring Tool",
    });
    browser.contextMenus.update("mwe-item-monarch", {
      enabled: true,
      title: "Send Graphic to Monarch",
    });
  }
}

/*Disable the context menu options*/
function disableContextMenu() {
  browser.contextMenus.update("mwe-item", { enabled: false });
  if (showDebugOptions) {
    browser.contextMenus.update("preprocess-only", { enabled: false });
    browser.contextMenus.update("request-only", { enabled: false });
  }
  if (monarchEnabled){
    browser.contextMenus.update("mwe-item-tat", { enabled: false });
    browser.contextMenus.update("mwe-item-monarch", { enabled: false });
  }
}

/*Handle the context menu items based on the status of the DOM*/
function handleUpdated(tabId: any, changeInfo: any) {
  if (changeInfo.status == "complete") {
    // console.log("handleUpdated called");
    enableContextMenu();
    //console.log("Handle Updated function", displayInvisibleButtons);
      // send message 
    if(ports[tabId] && !ports[tabId].sender?.url?.startsWith("chrome://") && !ports[tabId].sender?.url?.startsWith("chrome-extension://")){
      // handle map options
      browser.scripting.executeScript({
        target: { tabId: tabId || 0 }, 
        func: toggleMapOptions,
        args: [showDebugOptions, monarchEnabled]
      });

      // handle invisible buttons
      ports[tabId].postMessage({
        "type": "handleInvisibleButton",
        "displayInvisibleButtons": displayInvisibleButtons
      });
  } 
  } else if (changeInfo.status == "unloaded" || changeInfo.status == "loading") {
    disableContextMenu();
  }
}

/*Handle context menu items based on DOM for the active Tab*/
function getCurrentTabInfo() {
  let currentTab = browser.tabs.query({ currentWindow: true, active: true });
  currentTab.then(
    function (tabs) {
      handleUpdated(tabs[0].id, tabs[0]);
    },
    function (error) { console.debug(error) }
  );
}

browser.runtime.onConnect.addListener(storeConnection);
browser.tabs.onUpdated.addListener(handleUpdated);
browser.tabs.onActivated.addListener(getCurrentTabInfo);

function onCreated(): void {
  if (browser.runtime.lastError) {
    //console.error(browser.runtime.lastError);
  }
}

// browser.storage.sync.set({
//   mweItem: "mwe-item"
// })

var showDebugOptions: Boolean;

var monarchEnabled: Boolean;
var previousMonarchMode: Boolean;
var previousToggleState: Boolean;

var displayInvisibleButtons : Boolean;

getAllStorageSyncData().then((items) => {
  showDebugOptions = items["developerMode"];
  monarchEnabled = items["monarchEnabled"];
  //console.debug("monarchEnabled", monarchEnabled);
  previousToggleState = items["previousToggleState"];
  displayInvisibleButtons = items["displayInvisibleButtons"];
  console.debug("debug value inside storage sync data", showDebugOptions);
  if (showDebugOptions) {
    browser.contextMenus.create({
      id: "preprocess-only",
      title: (extVersion == 'development') ? (browser.i18n.getMessage("preprocessItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
      contexts: ["image"]
    }, onCreated);
    browser.contextMenus.create({
      id: "request-only",
      title: (extVersion == 'development') ? (browser.i18n.getMessage("requestItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
      contexts: ["image"]
    }, onCreated);
  }
  if(monarchEnabled){
    browser.contextMenus.create({
      id: "mwe-item-tat",
      title: "Load in Tactile Authoring Tool",
      contexts: ["image"]
    }, onCreated);
    browser.contextMenus.create({
      id: "mwe-item-monarch",
      title: "Send Graphic to Monarch",
      contexts: ["image"]
    }, onCreated);
  }
});

browser.runtime.onInstalled.addListener(function (object) {
  createOffscreen();
  let internalUrl = chrome.runtime.getURL("firstLaunch/firstLaunch.html");

  if ((object.reason === "install")) {
    windowsPanel ? browser.windows.create({
      type: "panel",
      url: internalUrl,
      width: 700,
      height: 700,
    }) : browser.tabs.create({
      url: internalUrl,
    });
  }

  browser.contextMenus.create({
    id: "mwe-item",
    title: (extVersion == 'development') ? (browser.i18n.getMessage("menuItem") + process.env.SUFFIX_TEXT) : browser.i18n.getMessage("menuItem"),
    contexts: ["image"]
  }, onCreated);

    // //Context menu option to display image in Authoring tool
    // browser.contextMenus.create({
    //   id: "mwe-item-tat",
    //   title: "Load in Tactile Authoring Tool",
    //   contexts: ["image"]
    // }, onCreated);
  
    // //Context menu option to send to Monarch
    // browser.contextMenus.create({
    //   id: "mwe-item-monarch",
    //   title: "Send Graphic to Monarch",
    //   contexts: ["image"]
    // }, onCreated);

});

browser.commands.onCommand.addListener(async (command) => {
  console.debug(`Command: ${command}`);
  try{
    if(launchPad != undefined){
      await windowsPanel ? browser.windows.remove(launchPad.id!) : browser.tabs.remove(launchPad.id!); 
    }
    launchPad = windowsPanel ? await browser.windows.create({
      type: "panel",
      url: "launchpad/launchpad.html",
      width: 700,
      height: 700,
    }) : await browser.tabs.create({
      url: "launchpad/launchpad.html",
    }); 
  } catch(error){
    console.error(error);
  }
  
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  //console.debug("Tab", tab);
  //console.debug("ports", ports);
  if (tab?.id && ports[tab.id]) {
    // Request image from page
    if (info.menuItemId === "mwe-item") {
      ports[tab.id].postMessage({
        "type": "resourceRequest",
        "tabId": tab.id,
      });
    } 
    else if (info.menuItemId === "mwe-item-tat") {
      ports[tab.id].postMessage({
        "type": "tactileAuthoringTool",
        "tabId": tab.id,
      });
    }
    else if(info.menuItemId === "mwe-item-monarch"){
      ports[tab.id].postMessage({
        "type": "sendToMonarch",
        "tabId": tab.id,
      });
    }
    else if (info.menuItemId === "preprocess-only") {
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
    windowsPanel ? browser.windows.create({
      type: "panel",
      url: "errors/http_error.html"
    }) : browser.tabs.create({
      url: "errors/http_error.html",
    });
  }
});

function createPanel(query: IMAGERequest) {
  let window = windowsPanel ? browser.windows.create({
    type: "normal",
    url: `info/info.html?uuid=${query["request_uuid"]}&graphicUrl=${graphicUrl}&dimensions=${query["dimensions"]}`,
    height: 1080,
    width: 1920
  }) : browser.tabs.create({
    url: `info/info.html?uuid=${query["request_uuid"]}&graphicUrl=${graphicUrl}&dimensions=${query["dimensions"]}`,
  });
  return window;
}
