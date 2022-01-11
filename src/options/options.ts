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
        console.warn("Unknown element \"" + label.id + "\"");
    }
}

function saveOptions() {
    browser.storage.sync.set({
        inputUrl: (<HTMLInputElement>document.getElementById("inputUrl")).value
    }),
    (function() {
        var status = (<HTMLInputElement>document.getElementById("status"));
        status.textContent = "Options successfully saved...";
        setTimeout(function() {
          status.textContent = '';
        }, 750);
      })()
   browser.storage.sync.get("inputUrl").then(res => { console.debug(res); });
};


function restore_options() {
     browser.storage.sync.get({
        // Use Bach as default sever
        "inputUrl": "https://image.a11y.mcgill.ca/"
        }).then(items => {
        (<HTMLInputElement>document.getElementById('inputUrl')).value = items["inputUrl"];
    });
  }

const submit = document.getElementById("preferences-submit");
if (submit) {
    document.addEventListener('DOMContentLoaded', restore_options);
    submit.textContent = browser.i18n.getMessage("savePreferences");
    submit?.addEventListener("click", () => saveOptions());
} else {
    console.warn("Could not find submit button with ID \"preferences-submit\"");
}
