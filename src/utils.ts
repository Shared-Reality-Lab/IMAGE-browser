import browser from "webextension-polyfill";
import { CAPABILITIES, RENDERERS } from "./config";

export function getAllStorageSyncData() {
    //let defaultDebugValue = (process.env.NODE_ENV === "test")?true:false;
    return browser.storage.sync.get({
      //Default values
      inputUrl: "",
      customServer:false,
      mcgillServer: true,
      developerMode: false,
      previousToggleState:false,
      noHaptics: true,
      haply2diy: false,
      audio: true,
      text: true,
      processItem: "",
      requestItem: "",
      mweItem: "",
      language: "auto"
    });
};

/** Return the Renderers supported by extension */
export async function getRenderers(): Promise<string[]>{
    let renderers : string[] = [];
    let items = await getAllStorageSyncData();
    if(items["audio"]){
      renderers.push(RENDERERS.segmentAudio);
      renderers.push(RENDERERS.simpleAudio);
    }
    if(items["text"]){
      renderers.push(RENDERERS.text);
    }
    if(items["haply2diy"]){
      renderers.push(RENDERERS.simpleHaptics);
      renderers.push(RENDERERS.photoAudioHaptics);
    }
    if(items['developerMode']){
      renderers.push(RENDERERS.svgLayers);
    }
    return renderers;
  }

/**Get the context for the HTML element */
export function getContext(selectedElement: HTMLElement) : string {
  const serializer = new XMLSerializer();
    let parentElement = <HTMLElement> selectedElement.parentElement;
    let result = document.createElement("div");
    if (parentElement && parentElement.innerText){
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
export async function getCapabilities(): Promise<string[]>{
  let capabilities = [];
  let items = await getAllStorageSyncData();
  if(items["developerMode"]){
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
