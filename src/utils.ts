import browser from "webextension-polyfill";

export function getAllStorageSyncData() {
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
      mweItem: ""
    });
};

export async function getRenderers(): Promise<string[]>{
    let renderers : string[] = [];
    let items = await getAllStorageSyncData();
    if(items["audio"]){
    renderers.push("ca.mcgill.a11y.image.renderer.SegmentAudio");
    renderers.push("ca.mcgill.a11y.image.renderer.SimpleAudio");
    }
    if(items["text"]){
    renderers.push("ca.mcgill.a11y.image.renderer.Text");
    }
    if(items["haply2diy"]){
    renderers.push("ca.mcgill.a11y.image.renderer.SimpleHaptics");
    renderers.push("ca.mcgill.a11y.image.renderer.PhotoAudioHaptics");
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

/** Return if the Debug Mode is enabled in extension settings */
export async function isDebugModeEnabled(): Promise<boolean>{
    const storageData = await getAllStorageSyncData();
    return storageData["developerMode"];
}