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
