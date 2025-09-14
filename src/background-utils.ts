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
import browser from "webextension-polyfill";
import { v4 as uuidv4 } from "uuid";
import { IMAGERequest } from "./types/request.schema";
import { getAllStorageSyncData, getCapabilities, getRenderers, getLanguage, windowsPanel } from './utils';
import { encryptData, monarchPopUp, saveToLocalStorage } from "./monarch/utils";
import { TatStorageData } from "./monarch/types";
import { openRenderingsinWindow } from "./config";

/**
 * Generates a query for remote resources
 * 
 * @param message - Object containing context, URL, dimensions, and graphic blob
 * @returns Promise resolving to an IMAGERequest object
 */
export async function generateQuery(message: { context: string, url: string, dims: [number, number], graphicBlob: string }): Promise<IMAGERequest> {
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

/**
 * Generates a query for local resources
 * 
 * @param message - Object containing context, dimensions, image, and graphic blob
 * @returns Promise resolving to an IMAGERequest object
 */
export async function generateLocalQuery(message: { context: string, dims: [number, number], image: string, graphicBlob: string }): Promise<IMAGERequest> {
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

/**
 * Generates a query for chart resources
 * 
 * @param message - Object containing highChartsData
 * @returns Promise resolving to an IMAGERequest object
 */
export async function generateChartQuery(message: { highChartsData: { [k: string]: unknown } }): Promise<IMAGERequest> {
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

/**
 * Processes tactile rendering data for Monarch or Tactile Authoring Tool
 * 
 * @param tactileSvgGraphic - SVG graphic data in base64 format
 * @param query - The IMAGERequest object
 * @param message - The message object containing options
 * @param serverUrl - The server URL to send requests to
 */
export async function processTactileRendering(tactileSvgGraphic: string, query: IMAGERequest, message: any, serverUrl: RequestInfo) {
  let items = await getAllStorageSyncData();
  let encodedSvg = tactileSvgGraphic.split("data:image/svg+xml;base64,")[1];
  let svgDom = atob(encodedSvg);
  console.log("SVG DOM", svgDom);
  let reqTitle = items["monarchTitle"];
  let reqSecretKey = items["monarchSecretKey"];
  let reqChannelId = items["monarchChannelId"];
  let encryptionKey = items["monarchEncryptionKey"];
  const flowType = reqChannelId ? "update" : "create";
  let monarchTargetUrl = `${serverUrl}/monarch`;
  monarchTargetUrl = monarchTargetUrl.replace(/([^:]\/)\/+/g, "$1");
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
    if (flowType == "create") {
      responseJSON = await response.json();
      browser.storage.sync.set({
        "monarchChannelId": responseJSON["id"],
        "monarchSecretKey": responseJSON["secret"]
      });
    }
    let currentTab = await browser.tabs.query({ active: true, currentWindow: true });
    
    // Check if the current tab is an extension page
    if (currentTab[0].url && !currentTab[0].url.startsWith('chrome-extension://')) {
      browser.scripting.executeScript({
        target: { tabId: currentTab[0].id || 0 },
        func: monarchPopUp,
        args: [responseJSON["id"], flowType]
      });
    } else {
      // If we're on an extension page, use notifications instead of alert
      const message = flowType === "create" 
        ? `New channel created with code ${responseJSON["id"]}`
        : `Graphic in channel ${responseJSON["id"]} has been updated!`;
      
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'image-icon-128.png',
        title: 'Monarch Response',
        message: message
      });
    }

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
    let tatTargetUrl =  `${serverUrl}/tat/`;
    tatTargetUrl = tatTargetUrl.replace(/([^:]\/)\/+/g, "$1");
    let tabs = await browser.tabs.query({ url: tatTargetUrl });
    
    /** encrypt data before storing in local storage */
    let encryptedSvgData = await encryptData(svgDom, encryptionKey);
    let encryptedTatData: TatStorageData = {channelId:"", graphicTitle:"", secretKey:""};
    for (let key of Object.keys(tatStorageData)) {
      let stringToEncrypt = tatStorageData[key as keyof TatStorageData];
      if (stringToEncrypt){
        encryptedTatData[key as keyof TatStorageData] = await encryptData(tatStorageData[key as keyof TatStorageData], encryptionKey);
      }
    }
    
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

/**
 * Converts a Blob to a base64 string
 * 
 * @param blob - The Blob to convert
 * @returns Promise resolving to the base64 string
 */
export function blobToBase64(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Creates a panel or tab to display renderings
 * 
 * @param query - The IMAGERequest object
 * @param graphicUrl - URL of the graphic
 * @returns Promise resolving to the created window or tab
 */
export function createPanel(query: IMAGERequest, graphicUrl: string) {
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

/**
 * Toggles map options based on debug and monarch settings
 * 
 * @param showDebugOptions - Boolean indicating whether to show debug options
 * @param monarchEnabled - Boolean indicating whether monarch is enabled
 */
export function toggleMapOptions(showDebugOptions: Boolean, monarchEnabled: Boolean) {
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
}

/**
 * Creates an offscreen document to keep the service worker running
 */
export async function createOffscreen() {
  // @ts-ignore
  await browser.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'keep service worker running',
  }).catch(() => { });
}

/**
 * Callback function for browser.contextMenus.create
 */
export function onCreated(): void {
  if (browser.runtime.lastError) {
    //console.error(browser.runtime.lastError);
  }
}
