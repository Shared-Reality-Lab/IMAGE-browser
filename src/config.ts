/** Target Server URL */
export const SERVER_URL: string = "https://image.a11y.mcgill.ca/";

/** Renderers Supported by Extension */
export const RENDERERS = Object.freeze({
    text: "ca.mcgill.a11y.image.renderer.Text",
    segmentAudio: "ca.mcgill.a11y.image.renderer.SegmentAudio",
    simpleAudio: "ca.mcgill.a11y.image.renderer.SimpleAudio",
    photoAudioHaptics: "ca.mcgill.a11y.image.renderer.PhotoAudioHaptics",
    simpleHaptics: "ca.mcgill.a11y.image.renderer.SimpleHaptics"
});

/** Capabilities supported by Extension */
export const CAPABILITIES = Object.freeze({
    debugMode : "ca.mcgill.a11y.image.capability.DebugMode"
});