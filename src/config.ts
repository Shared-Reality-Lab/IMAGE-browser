/** Target Server URL */
export const SERVER_URL: string = "https://image.a11y.mcgill.ca/";

/** Unicorn Server URL */
export const UNICORN_SERVER_URL: string = "https://unicorn.cim.mcgill.ca/image/";


/** Renderers Supported by Extension */
export const RENDERERS = Object.freeze({
    text: "ca.mcgill.a11y.image.renderer.Text",
    segmentAudio: "ca.mcgill.a11y.image.renderer.SegmentAudio",
    simpleAudio: "ca.mcgill.a11y.image.renderer.SimpleAudio",
    photoAudioHaptics: "ca.mcgill.a11y.image.renderer.PhotoAudioHaptics",
    simpleHaptics: "ca.mcgill.a11y.image.renderer.SimpleHaptics",
    svgLayers: "ca.mcgill.a11y.image.renderer.SVGLayers"
});

/** Capabilities supported by Extension */
export const CAPABILITIES = Object.freeze({
    debugMode : "ca.mcgill.a11y.image.capability.DebugMode"
});