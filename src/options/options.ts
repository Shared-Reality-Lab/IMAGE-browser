import  browser  from "webextension-polyfill";

// Set up localized names
const labels = Array.from(document.querySelectorAll("label"));
console.debug("Hello!");
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
        server: (<HTMLInputElement>document.getElementById("server")).value
    }),
    (function() {
        // Update status to let user know options were saved.
        var status = (<HTMLInputElement>document.getElementById("status"));
        status.textContent = "Options successfully saved...";
        setTimeout(function() {
          status.textContent = '';
        }, 750);
      })()
   browser.storage.sync.get("server").then(res => { console.log(res); });   
};

//Restores selection using the preferences stored in browser.storage.
function restore_options() {
    // Use Bach as default sever  
     browser.storage.sync.get({"server": "bach-server"}).then(items => { 
        (<HTMLInputElement>document.getElementById('server')).value = items["server"]; 
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