import { browser } from "webextension-polyfill-ts";

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

const submit = document.getElementById("preferences-submit");
if (submit) {
    submit.textContent = browser.i18n.getMessage("savePreferences");
} else {
    console.warn("Could not find submit button with ID \"preferences-submit\"");
}

// Handle save button press
/* TODO */
