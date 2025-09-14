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
import { Runtime } from "webextension-polyfill";
import { IMAGERequest } from "./request.schema";
import { IMAGEResponse } from "./response.schema";
import { TatStorageData } from "../monarch/types";
import { MESSAGE_TYPES, RENDER_TYPES } from "./message-types.constants";

/**
 * Base interface for all message types
 */
export interface BaseMessage {
  type: string;
  tabId?: number;
}

/**
 * Interface for info message type
 */
export interface InfoMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.INFO;
  request_uuid: string;
}

/**
 * Interface for resource message type
 */
export interface ResourceMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.RESOURCE;
  context: string;
  url: string;
  dims: [number, number];
  graphicBlob: string;
  sourceURL: string;
  toRender: typeof RENDER_TYPES.FULL | typeof RENDER_TYPES.PREPROCESS | typeof RENDER_TYPES.NONE;
  redirectToTAT?: boolean;
  specificTactileRendering?: SpecificTactileRendering;
  sendToMonarch?: boolean;
}

/**
 * Interface for local resource message type
 */
export interface LocalResourceMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.LOCAL_RESOURCE;
  context: string;
  dims: [number, number];
  image: string;
  graphicBlob: string;
  toRender: typeof RENDER_TYPES.FULL | typeof RENDER_TYPES.PREPROCESS | typeof RENDER_TYPES.NONE;
  redirectToTAT?: boolean;
  specificTactileRendering?: SpecificTactileRendering;
  sendToMonarch?: boolean;
}

/**
 * Interface for map resource message type
 */
export interface MapResourceMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.MAP_RESOURCE;
  toRender: typeof RENDER_TYPES.FULL | typeof RENDER_TYPES.PREPROCESS | typeof RENDER_TYPES.NONE;
  context?: string;
  coordinates?: [number, number];
  redirectToTAT?: boolean;
  specificTactileRendering?: SpecificTactileRendering;
  sendToMonarch?: boolean;
}

/**
 * Interface for settings saved message type
 */
export interface SettingsSavedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.SETTINGS_SAVED;
}

/**
 * Interface for chart resource message type
 */
export interface ChartResourceMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.CHART_RESOURCE;
  highChartsData: { [k: string]: unknown };
  toRender: typeof RENDER_TYPES.FULL | typeof RENDER_TYPES.PREPROCESS | typeof RENDER_TYPES.NONE;
  redirectToTAT?: boolean;
  specificTactileRendering?: SpecificTactileRendering;
  sendToMonarch?: boolean;
}

/**
 * Interface for map search message type
 */
export interface MapSearchMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.MAP_SEARCH;
  toRender: typeof RENDER_TYPES.FULL | typeof RENDER_TYPES.PREPROCESS | typeof RENDER_TYPES.NONE;
  context?: string;
  placeID?: string;
  redirectToTAT?: boolean;
  specificTactileRendering?: SpecificTactileRendering;
  sendToMonarch?: boolean;
}

/**
 * Interface for data from authoring tool message type
 */
export interface DataFromAuthoringToolMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.DATA_FROM_AUTHORING_TOOL;
  storageData: {
    graphicTitle: string;
    channelId: string;
    secretKey: string;
  };
}

/**
 * Interface for check image size message type
 */
export interface CheckImageSizeMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.CHECK_IMAGE_SIZE;
  sourceURL: string;
  toRender: typeof RENDER_TYPES.FULL | typeof RENDER_TYPES.PREPROCESS | typeof RENDER_TYPES.NONE;
  context?: string;
  url?: string;
  dims?: [number, number];
  graphicBlob?: string;
  redirectToTAT?: boolean;
  specificTactileRendering?: SpecificTactileRendering;
  sendToMonarch?: boolean;
}

/**
 * Interface for handle map monarch options message type
 */
export interface HandleMapMonarchOptionsMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.HANDLE_MAP_MONARCH_OPTIONS;
}

/**
 * Interface for tactile authoring tool message type
 */
export interface TactileAuthoringToolMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.TACTILE_AUTHORING_TOOL;
}

/**
 * Interface for send to monarch message type
 */
export interface SendToMonarchMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.SEND_TO_MONARCH;
}

/**
 * Interface for preprocess request message type
 */
export interface PreprocessRequestMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.PREPROCESS_REQUEST;
}

/**
 * Interface for only request message type
 */
export interface OnlyRequestMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.ONLY_REQUEST;
}

/**
 * Interface for compress image message type
 */
export interface CompressImageMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.COMPRESS_IMAGE;
  graphicBlobStr: string;
  blobType: string;
}

/**
 * Interface for handle invisible button message type
 */
export interface HandleInvisibleButtonMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.HANDLE_INVISIBLE_BUTTON;
  displayInvisibleButtons: boolean;
  monarchEnabled: boolean;
}

/**
 * Interface for ping message type
 */
export interface PingMessage extends BaseMessage {
  status: "ping";
}

/**
 * Union type for all message types
 */
export type Message =
  | InfoMessage
  | ResourceMessage
  | LocalResourceMessage
  | MapResourceMessage
  | SettingsSavedMessage
  | ChartResourceMessage
  | MapSearchMessage
  | DataFromAuthoringToolMessage
  | CheckImageSizeMessage
  | HandleMapMonarchOptionsMessage
  | TactileAuthoringToolMessage
  | SendToMonarchMessage
  | PreprocessRequestMessage
  | OnlyRequestMessage
  | CompressImageMessage
  | HandleInvisibleButtonMessage
  | PingMessage;

/**
 * Interface for response map entry
 */
export interface ResponseMapEntry {
  server: RequestInfo;
  response: IMAGEResponse;
  request: IMAGERequest;
}

/**
 * Interface for ports object
 */
export interface PortsMap {
  [key: number]: Runtime.Port;
}

/**
 * Interface for specific tactile rendering
 */
export interface SpecificTactileRendering {
  data: {
    graphic: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

