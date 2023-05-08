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
import imageCompression from 'browser-image-compression';
import { getAllStorageSyncData, getCapabilities, getRenderers } from './utils';
import { generateMapQuery, generateMapSearchQuery } from "./maps/maps-utils";
import { SERVER_URL } from './config';

let ports : { [key: number]: Runtime.Port } = {};
const responseMap: Map<string, { server: RequestInfo, response: IMAGEResponse, request: IMAGERequest }> = new Map();
var serverUrl: RequestInfo;
var renderingsPanel: browser.Windows.Window;
var graphicUrl: string = "";
var extVersion = process.env.NODE_ENV;
//console.log("Extension Version background page", extVersion);
//console.log("Suffix Text", process.env.SUFFIX_TEXT);
async function generateQuery(message: { context: string, url: string, dims: [number, number], graphicBlob: string }): Promise<IMAGERequest> {
  let renderers = await getRenderers();
  let capabilities = await getCapabilities();
  return {
    "request_uuid": uuidv4(),
    "timestamp": Math.round(Date.now() / 1000),
    "URL": message.url,
    "graphic": message.graphicBlob,
    "dimensions": message.dims,
    "context": message.context,
    "language": "en",
    "capabilities": capabilities,
    "renderers": renderers
  } as IMAGERequest;
}

async function generateLocalQuery(message: { context: string, dims: [number, number], image: string , graphicBlob: string}): Promise<IMAGERequest> {

  let renderers = await getRenderers();
  let capabilities = await getCapabilities();
  return {
    "request_uuid": uuidv4(),
    "timestamp": Math.round(Date.now() / 1000),
    "graphic": message.graphicBlob,
    "dimensions": message.dims,
    "context": message.context,
    "language": "en",
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
    "language": "en",
    "capabilities": capabilities,
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
      } else if (message["type"] === "mapSearch") {
        console.debug("Generating map query");
        query = await generateMapSearchQuery(message);
      } else if (message["type"] === "chartResource") {
        query = await generateChartQuery(message);
      } else {
        query = await generateLocalQuery(message);
      }
      if (message["toRender"] === "full") {
        let items = await getAllStorageSyncData();
        if (items["mcgillServer"] === true) {
          serverUrl = SERVER_URL;
        } else {
          if (items["inputUrl"] !== "" && items["customServer"] === true) {
            serverUrl = items["inputUrl"];
          }
        }
        var progressWindow = await browser.windows.create({
          type: "popup",
          url: "progressBar/progressBar.html",
          height: 100,
          width: 400,
        })
        let resp: Response;
        let json: IMAGEResponse = { "request_uuid": "", "timestamp": 0, "renderings": [] };
        try{
          resp = await fetch(serverUrl + "render", {
            "method": "POST",
            "headers": {
              "Content-Type": "application/json"
            },
            "body": JSON.stringify(query)
          });
          browser.windows.remove(progressWindow.id!)
          if (resp.ok) {
            json = await resp.json();
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
        } catch {
          browser.windows.remove(progressWindow.id!);
          browser.windows.create({
            type: "panel",
            url: "errors/http_error.html"
          });
          return;
        }
        if (json["renderings"].length > 0) {
          if (query["request_uuid"] !== undefined) {
            responseMap.set(query["request_uuid"],
              { "response": json, "request": query, "server": serverUrl }
            );
            if (renderingsPanel !== undefined) {
              try{
                await browser.windows.remove(renderingsPanel.id!)
                renderingsPanel = await createPanel(query);
              }catch{
                renderingsPanel = await createPanel(query);
              }
            } else {
              renderingsPanel = await createPanel(query);
            }
            // How to handle if request_uuid was undefined??
          }
        } else {
          await browser.windows.create({
            type: "panel",
            url: 'errors/no_renderings.html?uuid=' +
            encodeURIComponent((query['request_uuid']||'')) + "&hash=" +
            encodeURIComponent(hash(query)) + "&serverURL=" +
            encodeURIComponent(serverUrl.toString())
          });
        }
      }
      else if (message["toRender"] === "preprocess") {
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
      } else if (message["toRender"] === "none") {
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
      if (message["type"] === "settingsSaved") {
        await updateDebugContextMenu();
      }
      break;
    default:
      console.debug(message["type"]);
      break;
  }
}

async function updateDebugContextMenu() {
  let items = await getAllStorageSyncData();
  showDebugOptions = items["developerMode"];
  previousToggleState = items["previousToggleState"];
  let tabs = browser.tabs.query({})

  if (showDebugOptions) {
    tabs.then(function (tabs) {
      for (var i = 0; i < tabs.length; i++) {
        if(!tabs[i].url?.startsWith("chrome://")){
          browser.scripting.insertCSS({
            target: {tabId: tabs[i].id || 0},
            css: `
            button#preprocessor-map-button{
              display: inline-block;
            }`,
        });
        }
      }},function(){});

    if (items["processItem"] === "" && items["requestItem"] === "") {
      browser.contextMenus.create({
        id: "preprocess-only",
        title: (extVersion == 'test') ? (browser.i18n.getMessage("preprocessItem") +  process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
        contexts: ["image"]
      },
        onCreated);
      browser.contextMenus.create({
        id: "request-only",
        title: (extVersion == 'test') ? (browser.i18n.getMessage("requestItem") +  process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
        contexts: ["image"]
      },
        onCreated);
    }

    browser.storage.sync.set({
      previousToggleState: true,
      processItem: "preprocess-only",
      requestItem: "request-only",
    })
  }
  else if (showDebugOptions === false && previousToggleState) {
    browser.contextMenus.remove("preprocess-only");
    browser.contextMenus.remove("request-only");
    browser.storage.sync.set({ previousToggleState: false });
    browser.storage.sync.set({
      processItem: "",
      requestItem: "",
    });
    tabs.then(function (tabs) {
      for (var i = 0; i < tabs.length; i++) {
        if(tabs[i].id && !tabs[i].url?.startsWith("chrome://")){
          browser.scripting.insertCSS({
            target: {tabId: tabs[i].id || 0},
            css: `
            button#preprocessor-map-button{
              display: none;
            }`,
        });
        }
      }},function(){});
  }
}

function storeConnection(p: Runtime.Port) {
  let id = p.sender?.tab?.id;
  if (id) {
    ports[id] = p;
    ports[id].onMessage.addListener(handleMessage.bind(null, p));
    ports[id].onDisconnect.addListener((p: Runtime.Port) => {
      if(id){
        delete ports[id];
      }
    });
  }
}

/*Enable the context menu options*/
function enableContextMenu() {
  browser.contextMenus.update("mwe-item", { enabled: true });
  if (showDebugOptions) {
    browser.contextMenus.update("preprocess-only", { enabled: true })
    browser.contextMenus.update("request-only", { enabled: true });
  }
}

/*Disable the context menu options*/
function disableContextMenu() {
  browser.contextMenus.update("mwe-item", { enabled: false });
  if (showDebugOptions) {
    browser.contextMenus.update("preprocess-only", { enabled: false });
    browser.contextMenus.update("request-only", { enabled: false });
  }
}

/*Handle the context menu items based on the status of the DOM*/
function handleUpdated(tabId: any, changeInfo: any) {
  if (changeInfo.status == "complete") {
    enableContextMenu();
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
    function (error) { console.log(error) }
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
  title: (extVersion == 'test') ? (browser.i18n.getMessage("menuItem") +  process.env.SUFFIX_TEXT) : browser.i18n.getMessage("menuItem"),
  contexts: ["image"]
},
  onCreated);
// browser.storage.sync.set({
//   mweItem: "mwe-item"
// })

var showDebugOptions: Boolean;

var previousToggleState: Boolean;

getAllStorageSyncData().then((items) => {
  showDebugOptions = items["developerMode"];
  previousToggleState = items["previousToggleState"];
  console.log("debug value inside storage sync data", showDebugOptions);
  if (showDebugOptions) {
    browser.contextMenus.create({
      id: "preprocess-only",
      title: (extVersion == 'test') ? (browser.i18n.getMessage("preprocessItem") +  process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
      contexts: ["image"]
    },
      onCreated);
    browser.contextMenus.create({
      id: "request-only",
      title: (extVersion == 'test') ? (browser.i18n.getMessage("requestItem") +  process.env.SUFFIX_TEXT) : browser.i18n.getMessage("preprocessItem"),
      contexts: ["image"]
    },
      onCreated);
  }
});

browser.runtime.onInstalled.addListener(function (object) {
  let internalUrl = chrome.runtime.getURL("firstLaunch/firstLaunch.html");

  if ((object.reason === "install")) {
    browser.windows.create({
      type: "panel",
      url: internalUrl,
      width: 700,
      height: 700,
    });
  }
});

browser.commands.onCommand.addListener((command) => {
  console.log(`Command: ${command}`);
  browser.windows.create({
    type: "panel",
    url: "launchpad/launchpad.html",
    width: 700,
    height: 700,
  });
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

function createPanel(query: IMAGERequest) {
  let window = browser.windows.create({
    type: "panel",
    url: "info/info.html?uuid=" + query["request_uuid"] + "&" + "graphicUrl=" + graphicUrl,
    height: 1080,
    width: 1920
  });
  return window;
}
