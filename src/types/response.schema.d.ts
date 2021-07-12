/**
 * Response of renderings of an image given certain conditions.
 */
export interface IMAGEResponse {
  /**
   * UUID v4 identifying the request.
   */
  request_uuid: string;
  /**
   * Time the preprocessor was run in Unix time.
   */
  timestamp: number;
  /**
   * The renderings returned by the server along with additional information.
   */
  renderings: {
    /**
     * A reverse domain name identifier indicating a rendering data format sent from the server to the client
     */
    type_id: string;
    /**
     * Estimated percent confidence in the correctness of the rendering.
     */
    confidence: number;
    /**
     * A brief description of the rendering to inform the user of what it is before they use it.
     */
    description: string;
    /**
     * Metadata describing the handler that created a rendering.
     */
    metadata?: {
      /**
       * The page for this handler, its package, the team that made it, etc.
       */
      homepage?: string;
      /**
       * A brief description of the called handler.
       */
      description?: string;
      /**
       * The license the rendered content is made available under. This should be an SPDX identifier or URL to the license.
       */
      license?: string;
      [k: string]: unknown;
    };
    /**
     * A URL that resolves to the JSON schema for the data property.
     */
    data_schema?: string;
    /**
     * Rendering data as specified in the schema for this rendering type.
     */
    data: {
      [k: string]: unknown;
    };
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}
