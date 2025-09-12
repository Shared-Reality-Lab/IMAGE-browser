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

/**
 * Constants for message types to avoid string literals in switch statements
 */
export const MESSAGE_TYPES = {
  INFO: "info" as const,
  RESOURCE: "resource" as const,
  RESOURCE_REQUEST: "resourceRequest" as const,
  LOCAL_RESOURCE: "localResource" as const,
  MAP_RESOURCE: "mapResource" as const,
  SETTINGS_SAVED: "settingsSaved" as const,
  CHART_RESOURCE: "chartResource" as const,
  MAP_SEARCH: "mapSearch" as const,
  DATA_FROM_AUTHORING_TOOL: "dataFromAuthoringTool" as const,
  CHECK_IMAGE_SIZE: "checkImageSize" as const,
  HANDLE_MAP_MONARCH_OPTIONS: "handleMapMonarchOptions" as const,
  TACTILE_AUTHORING_TOOL: "tactileAuthoringTool" as const,
  SEND_TO_MONARCH: "sendToMonarch" as const,
  PREPROCESS_REQUEST: "preprocessRequest" as const,
  ONLY_REQUEST: "onlyRequest" as const,
  COMPRESS_IMAGE: "compressImage" as const,
  HANDLE_INVISIBLE_BUTTON: "handleInvisibleButton" as const,
  PING: "ping" as const
};

/**
 * Constants for render types to avoid string literals in switch statements
 */
export const RENDER_TYPES = {
  FULL: "full" as const,
  PREPROCESS: "preprocess" as const,
  NONE: "none" as const
};
