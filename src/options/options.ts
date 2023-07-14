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
import  browser  from "webextension-polyfill";
import { queryLocalisation } from "../utils";

let port = browser.runtime.connect();
let navigatorSerial = navigator.serial;

var extVersion = process.env.NODE_ENV || "";
//console.log("Extension Version options page", extVersion);

// load localized labels 
queryLocalisation();

const toggleButton = <HTMLInputElement>(document.getElementById("toggle"));
const mcgillServerSetting = <HTMLInputElement>(document.getElementById("mcgill-server"));
const customServerSetting = <HTMLInputElement>(document.getElementById("custom-server"));
const developerSettings = <HTMLInputElement>(document.getElementById("developerSettingsDiv"));
const noHapticsSetting = <HTMLInputElement>(document.getElementById("none-option"));
const haply2diySetting =  <HTMLInputElement>(document.getElementById("haply-option"));
const audioRenderingsSetting =  <HTMLInputElement>(document.getElementById("audio-renderings"));
const textRenderingsSetting = <HTMLInputElement>(document.getElementById("text-renderings"));
const languageSetting = <HTMLInputElement>(document.getElementById("language-selection"));

if (toggleButton) {
  toggleButton?.addEventListener("click", showDeveloperSettings);
} else {
  console.warn('Could not find toggle button with ID "toggle"');
}

function showDeveloperSettings() {
  if(toggleButton.checked){
    let haplyLabel = document.querySelector("#Haply2diy");
    if(navigatorSerial){
      haplyLabel!.textContent = browser.i18n.getMessage("Haply2diy");
      (document.getElementById("haply-option") as HTMLInputElement)!.disabled = false;
    } else {
      haplyLabel!.textContent = browser.i18n.getMessage("Haply2diyNotSupported");
      (document.getElementById("haply-option") as HTMLInputElement)!.disabled = true;
    }
    developerSettings.style.display = "block";
  } else {
    developerSettings.style.display = "none";
  }
}

function optionsCheck(){
  browser.storage.sync.get({
    inputUrl: "",
    customServer:false,
    noHaptics:true,
    audio:false,
    text:false
  })
  .then((items)=>{
    if(items["inputUrl"]=== "" && items["customServer"]=== true){
      window.alert(browser.i18n.getMessage("noInputURL"));
    } 
    else if(items["noHaptics"]=== true && items["audio"]=== false && items["text"]=== false ){
      window.alert(browser.i18n.getMessage("noRenderings"));
    }
    else{
     window.alert(browser.i18n.getMessage("perferencesSaved"));
    }
  });
}

function saveOptions() {
  browser.storage.sync.set({
    inputUrl: (<HTMLInputElement>document.getElementById("input-url")).value,
    mcgillServer: mcgillServerSetting.checked,
    customServer: customServerSetting.checked,
    developerMode: toggleButton.checked,
    noHaptics: noHapticsSetting.checked,
    haply2diy: haply2diySetting.checked,
    audio:audioRenderingsSetting.checked,
    text:textRenderingsSetting.checked,
    language:languageSetting.value
  }),
    (function () {
      optionsCheck();
      port.postMessage({
        type: "settingsSaved"
      });
    })();
}

function restore_options() {
  let defaultDebugValue = (extVersion === "test")?true:false;
  browser.storage.sync
    .get({
      //Default values
      inputUrl: "",
      mcgillServer: true,
      customServer:false,
      previousToggleState:false,
      developerMode: false,
      noHaptics:true,
      haply2diy:false,
      audio:true,
      text:true,
      language: "auto"
    })
    .then((items) => {
      (<HTMLInputElement>document.getElementById("input-url")).value =
        items["inputUrl"];
        mcgillServerSetting.checked = items["mcgillServer"];
        customServerSetting.checked = items["customServer"];
        toggleButton.checked = items["developerMode"];
        noHapticsSetting.checked= items["noHaptics"];
        haply2diySetting.checked= items["haply2diy"];
        audioRenderingsSetting.checked = items["audio"];
        textRenderingsSetting.checked = items["text"];
        languageSetting.value = items["language"];

        if (toggleButton.checked &&  navigatorSerial !== undefined) {
          developerSettings.style.display = "block"; 
        }
    });
    if(extVersion === "test"){
      document.getElementById("renderingOptions")!.innerText += process.env.SUFFIX_TEXT;
      document.getElementById("advancedOptions")!.innerText += process.env.SUFFIX_TEXT;
      document.getElementById("developerMode")!.innerText += process.env.SUFFIX_TEXT;
    } 
}

document.addEventListener("DOMContentLoaded", restore_options);

const submit = document.getElementById("saveChangesButton");
const cancel = document.getElementById("cancelButton");

if (submit) {
  submit?.addEventListener("click", saveOptions);
} else {
  console.warn('Could not find submit button with ID "preferences-submit"');
}

if(cancel){
  cancel?.addEventListener("click", () => window.location.reload());
}
