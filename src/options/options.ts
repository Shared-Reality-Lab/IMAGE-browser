import browser, { windows } from "webextension-polyfill";

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

let checkOptions = {
  "preprocessItem" : false,
  "requestItem" :false
}

const preproSettings = <HTMLInputElement>(
  document.getElementById("preprocessItem")
);
const requestSetting = <HTMLInputElement>document.getElementById("requestItem");

preproSettings.addEventListener("click", () => {
  checkOptions["preprocessItem"] = !checkOptions["preprocessItem"];
});

requestSetting.addEventListener("click", () => {
  checkOptions["requestItem"] = !checkOptions["requestItem"];
});

function saveOptions() {
  browser.storage.sync.set({
    inputUrl: (<HTMLInputElement>document.getElementById("inputUrl")).value,
    preprocessedItem: checkOptions["preprocessItem"],
    requestedItem: checkOptions["requestItem"],
  }),
    (function () {
      var status = <HTMLInputElement>document.getElementById("status");
      window.alert("Preferences Saved!");
      browser.runtime.reload();
      setTimeout(function () {
        status.textContent = "";
      }, 750);
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
      (<HTMLInputElement>document.getElementById("inputUrl")).value =
        items["inputUrl"];
      (<HTMLInputElement>document.getElementById("preprocessItem")).checked =
        items["preprocessedItem"] ;
      (<HTMLInputElement>document.getElementById("requestItem")).checked =
        items["requestedItem"];
    });
}

const submit = document.getElementById("preferences-submit");
if (submit) {
  document.addEventListener("DOMContentLoaded", restore_options);
  submit.textContent = browser.i18n.getMessage("savePreferences");
  submit?.addEventListener("click", () => saveOptions());
} else {
  console.warn('Could not find submit button with ID "preferences-submit"');
}
