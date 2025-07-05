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
import './options.css';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';

let port = browser.runtime.connect();
let navigatorSerial = navigator.serial;

var extVersion = process.env.NODE_ENV || "";
console.log("Extension Version options page", extVersion);

// load localized labels 
queryLocalisation();

const mcgillServerSetting = <HTMLInputElement>(document.getElementById("mcgill-server"));
const customServerSetting = <HTMLInputElement>(document.getElementById("custom-server"));
const developerSettings = <HTMLInputElement>(document.getElementById("toggle-developer-mode"));
const audioRenderingsSetting =  <HTMLInputElement>(document.getElementById("audio-renderings"));
const textRenderingsSetting = <HTMLInputElement>(document.getElementById("text-renderings"));
const languageSetting = <HTMLInputElement>(document.getElementById("language-selection"));
const displayInvisibleButtons = <HTMLInputElement>(document.getElementById("toggle-invisible-buttons"));
const monarchTitle = <HTMLInputElement>(document.getElementById("monarch-title"));
const monarchChannelId = <HTMLInputElement>(document.getElementById("monarch-channel-id"));
const monarchSecretKey = <HTMLInputElement>(document.getElementById("monarch-secret-key"));
const monarchEncryptionKey = <HTMLInputElement>(document.getElementById("monarch-encryption-key"));
const monarchSettings = <HTMLInputElement>(document.getElementById("toggle-monarch-options"));

developerSettings?.addEventListener("change", (event)=>{
  let debugText = <HTMLElement>document.querySelector("#debugText");
  debugText.style.display = developerSettings.checked ? "block" : "none";
});

monarchSettings?.addEventListener("change", (event)=>{
  let monarchOptions= <HTMLElement>document.querySelector("#monarch-options");
  monarchOptions.style.display = monarchSettings.checked ? "block" : "none";
});

languageSetting?.addEventListener("change", (event)=>{
  let languageWarning= <HTMLElement>document.querySelector("#languageWarning");
  const target = event.target as HTMLSelectElement;
  languageWarning.style.display = target?.value === "auto" ? "inline-block" : "none";
});


function optionsCheck(){
  browser.storage.sync.get({
    inputUrl: "",
    customServer:false,
    noHaptics:true,
    audio:false,
    text:false
  })
  .then((items)=>{
    const announcer = document.getElementById('announcements');
    let alertMessage = ""
    if(items["inputUrl"]=== "" && items["customServer"]=== true){
      alertMessage = browser.i18n.getMessage("noInputURL");
    } 
    else if(items["noHaptics"]=== true && items["audio"]=== false && items["text"]=== false ){
      alertMessage = browser.i18n.getMessage("noRenderings");
    }
    else{
      alertMessage = browser.i18n.getMessage("perferencesSaved");
    }
    announcer!.textContent = alertMessage;
    setTimeout(() => {
      announcer!.textContent = '';
    }, 1000);
  });
}

function saveOptions() {
  browser.storage.sync.set({
    inputUrl: (<HTMLInputElement>document.getElementById("input-url")).value,
    mcgillServer: mcgillServerSetting.checked,
    customServer: customServerSetting.checked,
    developerMode: developerSettings.checked,
    audio:audioRenderingsSetting.checked,
    text:textRenderingsSetting.checked,
    language:languageSetting.value,
    displayInvisibleButtons : displayInvisibleButtons.checked,
    monarchChannelId: monarchChannelId.value,
    monarchEncryptionKey: monarchEncryptionKey.value,
    monarchTitle: monarchTitle.value,
    monarchSecretKey: monarchSecretKey.value,
    monarchEnabled: monarchSettings.checked
  }),
    (function () {
      optionsCheck();
      port.postMessage({
        type: "settingsSaved"
      });
    })();
}

function restore_options() {
  let defaultDebugValue = (extVersion === "development")?true:false;
  browser.storage.sync
    .get({
      //Default values
      inputUrl: "",
      mcgillServer: true,
      customServer:false,
      previousToggleState:false,
      developerMode: false,
      audio:true,
      text:true,
      language: "auto",
      displayInvisibleButtons: true,
      monarchTitle: "",
      monarchChannelId: "",
      monarchSecretKey: "",
      monarchEncryptionKey: "",
      monarchEnabled: false,
      previousMonarchMode: false
    })
    .then((items) => {
      (<HTMLInputElement>document.getElementById("input-url")).value =
        items["inputUrl"];
        mcgillServerSetting.checked = items["mcgillServer"];
        customServerSetting.checked = items["customServer"];
        developerSettings.checked = items["developerMode"];
        monarchSettings.checked = items["monarchEnabled"];
        audioRenderingsSetting.checked = items["audio"];
        textRenderingsSetting.checked = items["text"];
        languageSetting.value = items["language"];
        displayInvisibleButtons.checked = items["displayInvisibleButtons"];
        monarchTitle.value = items["monarchTitle"]
        monarchChannelId.value = items["monarchChannelId"],
        monarchSecretKey.value = items["monarchSecretKey"],
        monarchEncryptionKey.value = items["monarchEncryptionKey"]
        if (developerSettings.checked &&  navigatorSerial !== undefined) {
          developerSettings.style.display = "block"; 
        }
        let monarchOptions= <HTMLElement>document.querySelector("#monarch-options");
        monarchOptions.style.display = monarchSettings.checked ? "block" : "none";
        let debugText = <HTMLElement>document.querySelector("#debugText");
        debugText.style.display = developerSettings.checked ? "block" : "none";
    });
    if(extVersion === "development"){
      document.getElementById("extensionPreferences")!.innerText += process.env.SUFFIX_TEXT;
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
