import browser from "webextension-polyfill";
import { CAPABILITIES, RENDERERS, openRenderingsinWindow } from "./config";

export let windowsPanel = openRenderingsinWindow;
export function getAllStorageSyncData() {
  let userAgent = navigator.userAgent;
  if (userAgent.includes("iPhone")) {
    windowsPanel = false;
    console.debug("mobile device");
  } else {
    console.debug("desktop device");
  }
  //let defaultDebugValue = (process.env.NODE_ENV === "development")?true:false;
  return browser.storage.sync.get({
    //Default values
    inputUrl: "",
    customServer: false,
    mcgillServer: true,
    developerMode: false,
    previousToggleState: false,
    noHaptics: true,
    haply2diy2gen: false,
    haply2diy3gen: false,
    audio: true,
    text: true,
    processItem: "",
    requestItem: "",
    mweItem: "",
    language: "auto",
    displayInvisibleButtons: true,
    monarchTitle: "",
    monarchChannelId: "",
    monarchEncryptionKey: "",
    monarchSecretKey: "",
    monarchEnabled: false,
    previousMonarchMode: false,
    monarchEnabledToggle: false
  });
};

/** Return the Renderers supported by extension */
export async function getRenderers(): Promise<string[]> {
  let renderers: string[] = [];
  let items = await getAllStorageSyncData();
  if (items["audio"]) {
    renderers.push(RENDERERS.segmentAudio);
    renderers.push(RENDERERS.simpleAudio);
  }
  if (items["text"]) {
    renderers.push(RENDERERS.text);
  }
  if (items["haply2diy2gen"] || items["haply2diy3gen"]) {
    renderers.push(RENDERERS.simpleHaptics);
    renderers.push(RENDERERS.photoAudioHaptics);
  }
  if (items['developerMode']) {
    renderers.push(RENDERERS.svgLayers);
  }
  if(items['monarchEnabled'] || items['monarchEnabledToggle']) {
    renderers.push(RENDERERS.tactileSvg);
  }
  return renderers;
}

/**Get the context for the HTML element */
export function getContext(selectedElement: HTMLElement): string {
  const serializer = new XMLSerializer();
  let parentElement = <HTMLElement>selectedElement.parentElement;
  let result = document.createElement("div");
  if (parentElement && parentElement.innerText) {
    result.appendChild(parentElement.cloneNode(true));
  } else if (parentElement) {
    let parentPrevSibling = parentElement.previousElementSibling
    let parentNextSibling = parentElement.nextElementSibling
    if (parentPrevSibling) result.appendChild(parentPrevSibling.cloneNode(true));
    if (parentElement) result.appendChild(parentElement.cloneNode(true))
    if (parentNextSibling) result.appendChild(parentNextSibling.cloneNode(true));
  }
  return serializer.serializeToString(result);
}

/** Return the capabilities supported by extension */
export async function getCapabilities(): Promise<string[]> {
  let capabilities = [];
  let items = await getAllStorageSyncData();
  if (items["developerMode"]) {
    capabilities.push(CAPABILITIES.debugMode);
  }
  return capabilities;
}

export async function getLanguage() {
  let langCode = await getAllStorageSyncData().then((languageCode) => {
    return languageCode.language;
  });

  if (langCode == "auto") {
    let UILang = browser.i18n.getUILanguage();
    console.log("Browser UI Language (locale): " + UILang);

    let UILangCode = UILang.slice(0, 2);
    if (["en", "fr"].includes(UILangCode)) {
      langCode = UILangCode;
    }
    else {
      console.log("UILang not supported: " + UILang);
      console.log("Falling back to English as default.")
      langCode = "en";
    }
  }

  return langCode;
}

export function queryLocalisation() {
  // Set up localized names: getting all elements with class "localisation"
  const localisation = Array.from(document.querySelectorAll(".localisation"));
  for (let label of localisation) {
    const val = browser.i18n.getMessage(label.id);
    if (val) {
      label.textContent = val;
    } else {
      console.warn('Unknown element "' + label.id + '"');
    }
  }
}

/** Configuration for modal buttons */
interface ButtonConfig {
    /** Button text to display */
    text: string;
    /** Message type for port communication */
    type: string;
    /** Additional parameters for specific button types */
    additionalParams?: {
        /** Whether to redirect to Tactile Authoring Tool */
        redirectToTAT?: boolean;
        /** Whether to send to Monarch */
        sendToMonarch?: boolean;
    };
}

/** Creates the base message object for port communication */
function createBaseMessage(selectedElement: HTMLElement, imageElement: HTMLImageElement) {
    return {
        "context": selectedElement ? getContext(selectedElement) : null,
        "dims": [imageElement.naturalWidth, imageElement.naturalHeight],
        "url": window.location.href,
        "sourceURL": imageElement.currentSrc,
        "toRender": "full"
    };
}

/** Creates a button element with consistent styling and behavior */
function createButton(config: ButtonConfig, modal: HTMLDivElement, selectedElement: HTMLElement, imageElement: HTMLImageElement, port: browser.Runtime.Port): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = config.text;
    button.className = 'image-options-button';
    button.onclick = () => {
        modal.remove();
        const message = {
            ...createBaseMessage(selectedElement, imageElement),
            "type": config.type,
            ...config.additionalParams
        };
        port.postMessage(message);
    };
    return button;
}

/** Shows a modal with options for interacting with the selected image */
export function showImageOptionsModal(selectedElement: HTMLElement, imageElement: HTMLImageElement, port: browser.Runtime.Port) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'image-options-modal';

    // Define button configurations
    const buttonConfigs: ButtonConfig[] = [
        {
            text: 'Interpret this graphic with IMAGE',
            type: 'checkImageSize'
        },
        {
            text: 'Load in Tactile Authoring tool',
            type: 'checkImageSize',
            additionalParams: {
                redirectToTAT: true,
                sendToMonarch: false
            }
        },
        {
            text: 'Send Graphic to Monarch',
            type: 'checkImageSize',
            additionalParams: {
                redirectToTAT: true,
                sendToMonarch: true
            }
        }
    ];

    // Create and add buttons
    buttonConfigs.forEach(config => {
        const button = createButton(config, modal, selectedElement, imageElement, port);
        modal.appendChild(button);
    });

    // Add modal to page
    document.body.appendChild(modal);

    // Add click outside to close
    document.addEventListener('click', function closeModal(e) {
        if (!modal.contains(e.target as Node)) {
            modal.remove();
            document.removeEventListener('click', closeModal);
        }
    });
}
