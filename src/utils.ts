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