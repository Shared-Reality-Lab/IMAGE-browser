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

let port = browser.runtime.connect();

navigator.serial
let navigatorSerial = navigator.serial;

// Set up localized names
const labels = Array.from(document.querySelectorAll("label"));
for (let label of labels) {
  const val = browser.i18n.getMessage(label.id);
  if (val) {
    label.textContent = val;
  } else {
    console.warn('Unknown element "' + label.id + '"');
  }
}

const toggleButton = <HTMLInputElement>(document.getElementById("toggle"));
const mcgillServerSetting = <HTMLInputElement>(document.getElementById("mcgill-server"));
const customServerSetting = <HTMLInputElement>(document.getElementById("custom-server"));
const developerSettings = <HTMLInputElement>(document.getElementById("developerSettingsDiv"));
const noHapticsSetting = <HTMLInputElement>(document.getElementById("none-option"));
const haply2diySetting =  <HTMLInputElement>(document.getElementById("haply-option"));
const audioRenderingsSetting =  <HTMLInputElement>(document.getElementById("audio-renderings"));
const textRenderingsSetting = <HTMLInputElement>(document.getElementById("text-renderings"));

if (toggleButton) {
  toggleButton?.addEventListener("click", showDeveloperSettings);
} else {
  console.warn('Could not find toggle button with ID "toggle"');
}

function showDeveloperSettings() {
if (toggleButton.checked && navigatorSerial !== undefined) {
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
    if(items["inputUrl"]==="" && items["customServer"]=== true){
    window.alert("Continuing without entering Custom URL will not give any renderings.");
    } 
    else if(items["noHaptics"]===true && items["audio"]===false && items["text"]===false ){
      window.alert("No interpretations will appear when both Audio and Text are unchecked!");
    }
    else{
     window.alert("Preferences Saved!");
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
    text:textRenderingsSetting.checked
  }),
    (function () {
      optionsCheck();
      port.postMessage({
        type: "settingsSaved"
      });
    })();
}

function restore_options() {
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
      text:false
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

        if (toggleButton.checked &&  navigatorSerial !== undefined) {
          developerSettings.style.display = "block"; 
        }
    }); 
}

document.addEventListener("DOMContentLoaded", restore_options);

const submit = document.getElementById("preferences-submit");
const cancel = document.getElementById("cancel-button");

if (submit) {
  submit.textContent = browser.i18n.getMessage("saveChanges");
  submit?.addEventListener("click", saveOptions);
} else {
  console.warn('Could not find submit button with ID "preferences-submit"');
}

function reload(){
  window.location.reload();
}

if(cancel){
  cancel?.addEventListener("click", reload
  );
}
