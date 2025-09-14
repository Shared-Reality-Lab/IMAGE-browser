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
import hash from "object-hash";
import { IMAGEResponse } from "./types/response.schema";
import { IMAGERequest } from "./types/request.schema";
import { getAllStorageSyncData, getLanguage, windowsPanel } from './utils';
import { generateMapQuery, generateMapSearchQuery } from "./maps/maps-utils";
import { RENDERERS, SERVER_URL } from './config';
import { decryptData } from "./monarch/utils";
import { 
  Message, 
  ResourceMessage, 
  LocalResourceMessage, 
  ChartResourceMessage,
  MapResourceMessage,
  MapSearchMessage,
  CheckImageSizeMessage,
  DataFromAuthoringToolMessage,
  InfoMessage,
  ResponseMapEntry, 
  PortsMap
} from "./types/background.types";
import { MESSAGE_TYPES, RENDER_TYPES } from "./types/message-types.constants";
import { 
  generateQuery, 
  generateLocalQuery, 
  generateChartQuery, 
  processTactileRendering, 
  blobToBase64, 
  createPanel, 
  toggleMapOptions, 
  createOffscreen, 
  onCreated 
} from "./background-utils";

// ============================================================================
// Global state
// ============================================================================

/**
 * Global variables and constants for the background script
 */
// Connection and communication
let ports: PortsMap = {};
const responseMap: Map<string, ResponseMapEntry> = new Map();
var serverUrl: RequestInfo;
var graphicUrl: string = "";

// UI elements
var renderingsPanel: browser.Windows.Window | browser.Tabs.Tab;
var errorPanel: browser.Windows.Window | browser.Tabs.Tab;
let launchPad: browser.Windows.Window | browser.Tabs.Tab;

// Extension settings
var extVersion = process.env.NODE_ENV;
var showDebugOptions: Boolean;
var monarchEnabled: Boolean;
var previousMonarchMode: Boolean;
var previousToggleState: Boolean;
var displayInvisibleButtons: Boolean;

// ============================================================================
// Message handling
// ============================================================================

/**
 * Handles messages from content scripts
 * 
 * @param p - The port that the message was received on
 * @param message - The message object
 */
async function handleMessage(p: Runtime.Port, message: Message) {
  console.debug("Handling message", message);
  let query: IMAGERequest | undefined;
  if ('sourceURL' in message) {
    graphicUrl = message.sourceURL;
  }
  
  // Use type assertion with switch statement for type narrowing
  switch (message.type) {
    case MESSAGE_TYPES.INFO: {
      const infoMessage = message as InfoMessage;
      const value = responseMap.get(infoMessage.request_uuid);
      p.postMessage(value);
      responseMap.delete(infoMessage.request_uuid);
      break;
    }
    case MESSAGE_TYPES.RESOURCE: {
      const resourceMessage = message as ResourceMessage;
      query = await generateQuery(resourceMessage);
      break;
    }
    case MESSAGE_TYPES.LOCAL_RESOURCE: {
      const localResourceMessage = message as LocalResourceMessage;
      query = await generateLocalQuery(localResourceMessage);
      break;
    }
    case MESSAGE_TYPES.MAP_RESOURCE: {
      console.debug("Generating map query");
      const mapResourceMessage = message as MapResourceMessage;
      if (mapResourceMessage.context && mapResourceMessage.coordinates) {
        query = await generateMapQuery({
          context: mapResourceMessage.context,
          coordinates: mapResourceMessage.coordinates
        });
      }
      break;
    }
    case MESSAGE_TYPES.SETTINGS_SAVED: {
      await updateDebugContextMenu();
      break;
    }
    case MESSAGE_TYPES.CHART_RESOURCE: {
      const chartResourceMessage = message as ChartResourceMessage;
      query = await generateChartQuery(chartResourceMessage);
      break;
    }
    case MESSAGE_TYPES.MAP_SEARCH: {
      console.debug("Generating map query");
      const mapSearchMessage = message as MapSearchMessage;
      if (mapSearchMessage.context && mapSearchMessage.placeID) {
        query = await generateMapSearchQuery({
          context: mapSearchMessage.context,
          placeID: mapSearchMessage.placeID
        });
      }
      break;
    }
    case MESSAGE_TYPES.DATA_FROM_AUTHORING_TOOL: {
      console.debug("Data received from Authoring Tool");
      const dataFromAuthoringToolMessage = message as DataFromAuthoringToolMessage;
      let items = await getAllStorageSyncData();
      const encryptionKey = items["monarchEncryptionKey"];
      const [title, channelId, secretKey] = await Promise.all([
        decryptData(dataFromAuthoringToolMessage.storageData.graphicTitle, encryptionKey), 
        decryptData(dataFromAuthoringToolMessage.storageData.channelId, encryptionKey), 
        decryptData(dataFromAuthoringToolMessage.storageData.secretKey, encryptionKey)
      ]);
      //console.log("Decrypted Data", title, channelId, secretKey);
      await browser.storage.sync.set({
        monarchTitle: title,
        monarchChannelId: channelId,
        monarchSecretKey: secretKey
      });
      break;
    }
    case MESSAGE_TYPES.CHECK_IMAGE_SIZE: {
      console.debug("Checking Image Size");
      const checkImageSizeMessage = message as CheckImageSizeMessage;
      let blob = await fetch(checkImageSizeMessage.sourceURL).then(r => r.blob());
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
              "type": MESSAGE_TYPES.COMPRESS_IMAGE,
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
        const graphicBlobStr = await blobToBase64(blob) as string;
        if (checkImageSizeMessage.context && checkImageSizeMessage.url && checkImageSizeMessage.dims) {
          query = await generateQuery({
            context: checkImageSizeMessage.context,
            url: checkImageSizeMessage.url,
            dims: checkImageSizeMessage.dims,
            graphicBlob: graphicBlobStr
          });
        }
      }
      break;
    }
    case MESSAGE_TYPES.HANDLE_MAP_MONARCH_OPTIONS: {
      console.debug("Handling map monarch options");
      getCurrentTabInfo();
      break;
    }
    default:
      console.debug(message.type);
  }
  if (query) {
    // Determine toRender value based on message type
    let toRender: typeof RENDER_TYPES.FULL | typeof RENDER_TYPES.PREPROCESS | typeof RENDER_TYPES.NONE | undefined;
    
    if ('toRender' in message) {
      toRender = (message as any).toRender;
    }
    
    console.debug("Value of toRender ", toRender);
    if (toRender) {
      switch (toRender) {
      case RENDER_TYPES.FULL:
        {
          let items = await getAllStorageSyncData();
          if (items["mcgillServer"] === true) {
            serverUrl = SERVER_URL;
          } else {
            if (items["inputUrl"] !== "" && items["customServer"] === true) {
              serverUrl = items["inputUrl"];
            }
          }
          
          // Check if we have specific tactile rendering data and can skip server call
          const hasRedirectToTAT = 'redirectToTAT' in message && 'specificTactileRendering' in message && 
                                  message.redirectToTAT && message.specificTactileRendering;
          
          if (hasRedirectToTAT) {
            console.log("Skipping server call - using provided tactile rendering data");
            const specificMessage = message as any;
            let tactileSvgGraphic = specificMessage.specificTactileRendering.data.graphic as string;
            await processTactileRendering(tactileSvgGraphic, query, message, serverUrl);
            return;
          }
          
          // Original server call flow for cases without specific tactile rendering
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
            // close existing error panel if it exists
            windowsPanel ? (errorPanel && browser.windows.remove(errorPanel.id!)) : (errorPanel && browser.tabs.remove(errorPanel.id!));
            if (resp.ok) {
              json = await resp.json();
            } else {
              errorPanel = windowsPanel ? await browser.windows.create({
                type: "panel",
                url: "errors/http_error.html"
              }) : await browser.tabs.create({
                url: "errors/http_error.html",
              });
              console.error(`HTTP Error ${resp.status}: ${resp.statusText}`);
              const textContent = await resp.text();
              console.error(textContent);
              throw new Error(textContent);
            }
          } catch {
            windowsPanel ? browser.windows.remove(progressWindow.id!) : browser.tabs.remove(progressWindow.id!);
            // close existing error panel if it exists
            windowsPanel ? (errorPanel && browser.windows.remove(errorPanel.id!)) : (errorPanel && browser.tabs.remove(errorPanel.id!));
            errorPanel = windowsPanel ? await browser.windows.create({
              type: "panel",
              url: "errors/http_error.html"
            }) : await browser.tabs.create({
              url: "errors/http_error.html",
            });
            return;
          }
          if (json["renderings"].length > 0) {
            console.log("Inside JSON Renderings");
            console.log("message", message);
            const hasRedirectToTAT = 'redirectToTAT' in message && message.redirectToTAT;
            
            if (hasRedirectToTAT) {
              console.log("Received TAT data in background script");
              let tactileSvgGraphic: string;
              
              // Check if specific tactile rendering is provided
              const specificMessage = message as any;
              
              if ('specificTactileRendering' in message && specificMessage.specificTactileRendering) {
                console.log("Using specific tactile rendering provided");
                tactileSvgGraphic = specificMessage.specificTactileRendering.data.graphic as string;
              } else {
                // Fallback to existing behavior - use first tactile rendering from server response
                console.log("Using first tactile rendering from server response");
                let tactileResponse = json.renderings.filter((rendering) => (rendering.type_id == RENDERERS.tactileSvg));
                if (tactileResponse.length === 0) {
                  console.error("No Tactile SVG rendering found in response");  
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
                  return;
                }
                tactileSvgGraphic = tactileResponse[0].data.graphic as string;
              }
              
              // Use the refactored function to process the tactile rendering
              await processTactileRendering(tactileSvgGraphic, query, message, serverUrl);
            }
            else {
              if (query["request_uuid"] !== undefined) {
                responseMap.set(query["request_uuid"],
                  { "response": json, "request": query, "server": serverUrl }
                );
                if (renderingsPanel !== undefined) {
                  try {
                    await windowsPanel ? browser.windows.remove(renderingsPanel.id!) : browser.tabs.remove(renderingsPanel.id!);
                    renderingsPanel = await createPanel(query, graphicUrl);
                  } catch {
                    renderingsPanel = await createPanel(query, graphicUrl);
                  }
                } else {
                  renderingsPanel = await createPanel(query, graphicUrl);
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

      case RENDER_TYPES.PREPROCESS:
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
      case RENDER_TYPES.NONE:
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
}
// ============================================================================
// Context menu management
// ============================================================================

//browser.runtime.onInstalled.addListener(() => {createOffscreen();});
browser.runtime.onStartup.addListener(() => { createOffscreen(); });
// a message from an offscreen document every 50 second resets the inactivity timer
browser.runtime.onMessage.addListener(msg => {
  if (msg.keepAlive) console.debug('keepAlive');
});


/**
 * Updates the context menu based on user settings
 * 
 * This function reads settings from storage and updates the context menu items accordingly.
 * It also updates the UI elements in all open tabs to reflect the current settings.
 */
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
        "type": MESSAGE_TYPES.HANDLE_INVISIBLE_BUTTON,
        "displayInvisibleButtons": displayInvisibleButtons,
        "monarchEnabled": monarchEnabled
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


// ============================================================================
// Connection management
// ============================================================================

/**
 * Stores a connection to a content script
 * 
 * @param p - The port to store
 */
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

/**
 * Enables the context menu options based on current settings
 * 
 * Updates the context menu items to be enabled and sets their titles
 * according to the current extension settings.
 */
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

/**
 * Disables the context menu options
 */
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

/**
 * Handle the context menu items based on the status of the DOM
 * 
 * Updates context menu and tab-specific settings when a tab's status changes.
 * Enables or disables context menu items and updates UI elements accordingly.
 * 
 * @param tabId - The ID of the tab being updated
 * @param changeInfo - Information about the change
 */
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
        "type": MESSAGE_TYPES.HANDLE_INVISIBLE_BUTTON,
        "displayInvisibleButtons": displayInvisibleButtons,
        "monarchEnabled": monarchEnabled
      });
  } 
  } else if (changeInfo.status == "unloaded" || changeInfo.status == "loading") {
    disableContextMenu();
  }
}

/**
 * Handle context menu items based on DOM for the active Tab
 * 
 * Retrieves information about the currently active tab and updates
 * the context menu items accordingly by calling handleUpdated.
 */
function getCurrentTabInfo() {
  let currentTab = browser.tabs.query({ currentWindow: true, active: true });
  currentTab.then(
    function (tabs) {
      handleUpdated(tabs[0].id, tabs[0]);
    },
    function (error) { console.debug(error) }
  );
}

// ============================================================================
// Event listeners
// ============================================================================

browser.runtime.onConnect.addListener(storeConnection);
browser.tabs.onUpdated.addListener(handleUpdated);
browser.tabs.onActivated.addListener(getCurrentTabInfo);

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize extension settings from storage
 * 
 * Loads user preferences and settings from storage and sets up
 * the context menu items accordingly.
 */
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

/**
 * Handle extension installation and updates
 * 
 * Sets up the extension when it's first installed or updated.
 * Creates necessary context menu items and shows the first launch page
 * for new installations.
 * 
 * @param object - Installation details including the reason for installation
 */
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

/**
 * Handle keyboard commands
 * 
 * Listens for keyboard shortcuts and performs the appropriate action.
 * Currently handles opening the launchpad.
 * 
 * @param command - The command that was triggered
 */
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

/**
 * Handle context menu clicks
 * 
 * Processes clicks on context menu items and sends appropriate messages
 * to the content script in the tab where the click occurred.
 * 
 * @param info - Information about the context menu item that was clicked
 * @param tab - The tab where the context menu was clicked
 */
browser.contextMenus.onClicked.addListener((info, tab) => {
  //console.debug("Tab", tab);
  //console.debug("ports", ports);
  if (tab?.id && ports[tab.id]) {
    // Request image from page
    if (info.menuItemId === "mwe-item") {
      ports[tab.id].postMessage({
        "type": MESSAGE_TYPES.RESOURCE_REQUEST,
        "tabId": tab.id,
      });
    } 
    else if (info.menuItemId === "mwe-item-tat") {
      ports[tab.id].postMessage({
        "type": MESSAGE_TYPES.TACTILE_AUTHORING_TOOL,
        "tabId": tab.id,
      });
    }
    else if(info.menuItemId === "mwe-item-monarch"){
      ports[tab.id].postMessage({
        "type": MESSAGE_TYPES.SEND_TO_MONARCH,
        "tabId": tab.id,
      });
    }
    else if (info.menuItemId === "preprocess-only") {
      ports[tab.id].postMessage({
        "type": MESSAGE_TYPES.PREPROCESS_REQUEST,
        "tabId": tab.id
      });
    } else if (info.menuItemId === "request-only") {
      ports[tab.id].postMessage({
        "type": MESSAGE_TYPES.ONLY_REQUEST,
        "tabId": tab.id
      });
    }
  } else {
    console.error("No tab passed to context menu listener!");
    windowsPanel ? (errorPanel && browser.windows.remove(errorPanel.id!)) : (errorPanel && browser.tabs.remove(errorPanel.id!));
    windowsPanel ? browser.windows.create({
      type: "panel",
      url: "errors/http_error.html"
    }) : browser.tabs.create({
      url: "errors/http_error.html",
    });
  }
});
