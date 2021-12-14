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