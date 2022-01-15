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

const toggleButton = document.getElementById("toggle");
if (toggleButton) {
  toggleButton?.addEventListener("click", showDeveloperSettings);
} else {
  console.warn('Could not find toggle button with ID "toggle"');
}

function showDeveloperSettings() {
  var developerSettings = <HTMLInputElement>(
    document.getElementById("developerSettingsDiv")
  );
  if (developerSettings.style.display === "none") {
    developerSettings.style.display = "block";
  } else {
    developerSettings.style.display = "none";
  }
}

const preproSettings = <HTMLInputElement>(document.getElementById("preprocess-item"));
const requestSetting = <HTMLInputElement>(document.getElementById("request-item"));

function saveOptions() {
  browser.storage.sync.set({
    inputUrl: (<HTMLInputElement>document.getElementById("input-url")).value,
    preprocessedItem: preproSettings.checked,
    requestedItem: requestSetting.checked
  }),
    (function () {
      window.alert("Preferences Saved!");
      browser.runtime.reload();
    })();
}

function restore_options() {
  browser.storage.sync
    .get({
      //Default values
      inputUrl: "https://image.a11y.mcgill.ca/",
      preprocessedItem: false,
      requestedItem: false,
    })
    .then((items) => {
      (<HTMLInputElement>document.getElementById("input-url")).value =
        items["inputUrl"];
        preproSettings.checked = items["preprocessedItem"] ;
        requestSetting.checked = items["requestedItem"];
    });
}

document.addEventListener("DOMContentLoaded", restore_options);

const submit = document.getElementById("preferences-submit");
if (submit) {
  submit.textContent = browser.i18n.getMessage("savePreferences");
  submit?.addEventListener("click", saveOptions);
} else {
  console.warn('Could not find submit button with ID "preferences-submit"');
}
