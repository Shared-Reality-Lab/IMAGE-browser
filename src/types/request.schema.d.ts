
/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Request for renderings of a graphic or a map given certain conditions.
 */
export type IMAGERequest = IMAGERequest1 & IMAGERequest2;
export type IMAGERequest2 = {
  [k: string]: unknown;
};

export interface IMAGERequest1 {
  /**
   * UUID v4 identifying the request.
   */
  request_uuid?: string;
  /**
   * Time the preprocessor was run in Unix time.
   */
  timestamp?: number;
  /**
   * Data URL of the base 64 graphic being handled.
   */
  graphic?: string;
  /**
   * Chart data in the HighCharts format (https://api.highcharts.com/highcharts/)
   */
  highChartsData?: {
    [k: string]: unknown;
  };
  /**
   * The width and height of the graphic as requested in pixels.
   */
  dimensions?: [number, number];
  /**
   * WGS 84 representation of the location identified in a map
   */
  coordinates?: {
    latitude: number;
    longitude: number;
    [k: string]: unknown;
  };
  /**
   * The Google place ID of the location identified in a map.
   */
  placeID?: string;
  /**
   * Serialized XML of the source node and possibly related nodes.
   */
  context?: string;
  /**
   * URL of the page the request was generated from.
   */
  URL?: string;
  /**
   * Language requested by the user as ISO 639-1.
   */
  language?: string;
  /**
   * The capabilities available to handlers based on the user, hardware, and software.
   */
  capabilities?: string[];
  /**
   * Renderers supported by the client.
   */
  renderers?: string[];
  /**
   * Additional data added by preprocessors AFTER the request is sent. Preprocessor data are indexed via a reverse domain name identifier
   */
  preprocessors?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
