/** Target Server URL */
export const SERVER_URL: string = "https://image.a11y.mcgill.ca/";

/** Unicorn Server URL */
export const UNICORN_SERVER_URL: string = "https://unicorn.cim.mcgill.ca/image/";

/** TAT URL */
export const TAT_URL: string = "https://tat.unicorn.cim.mcgill.ca/";

/** MONARCH URL */
export const MONARCH_URL: string = "https://monarch.unicorn.cim.mcgill.ca";

/** Renderers Supported by Extension */
export const RENDERERS = Object.freeze({
    text: "ca.mcgill.a11y.image.renderer.Text",
    segmentAudio: "ca.mcgill.a11y.image.renderer.SegmentAudio",
    simpleAudio: "ca.mcgill.a11y.image.renderer.SimpleAudio",
    photoAudioHaptics: "ca.mcgill.a11y.image.renderer.PhotoAudioHaptics",
    simpleHaptics: "ca.mcgill.a11y.image.renderer.SimpleHaptics",
    svgLayers: "ca.mcgill.a11y.image.renderer.SVGLayers",
    tactileSvg: "ca.mcgill.a11y.image.renderer.TactileSVG"
});

/** Capabilities supported by Extension */
export const CAPABILITIES = Object.freeze({
    debugMode: "ca.mcgill.a11y.image.capability.DebugMode"
});

/** Buttons visibility switch to false default*/
export const displayButtons = false;

/** IMAGE result creates a new tab or a new window */
export const openRenderingsinWindow = true;

export const TUTORIAL_PAGE: string = "https://image.a11y.mcgill.ca/pages/tutorial.html";