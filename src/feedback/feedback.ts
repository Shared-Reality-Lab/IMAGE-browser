/*
 * Copyright (c) 2022 IMAGE Project, Shared Reality Lab, McGill University
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
import 'bootstrap/dist/css/bootstrap.css';
import browser from "webextension-polyfill";
import { queryLocalisation } from '../utils';

// load localized labels
queryLocalisation();

const urlParams = new URLSearchParams(window.location.search);
const request_uuid = urlParams.get("uuid") || "";
const objectHash = urlParams.get("hash") || "";
const serverURL = urlParams.get("serverURL") || "";

if (request_uuid === "" || objectHash === "" || serverURL === "") { 
    console.error("UUID or hash or server empty. This shouldn't happen. Verify GET parameters."); 
}

const formButton = document.getElementById("feedbackSubmit");
formButton?.addEventListener("click", () => {
    const checkbox = document.getElementById("consent-save") as HTMLInputElement;
    let lang = browser.i18n.getUILanguage().slice(0, 2);

    if (checkbox?.checked) {
        const saveEndPointUrl = new URL("/authenticate/" + request_uuid + "/" + objectHash, serverURL);
        console.debug(saveEndPointUrl);
        fetch(saveEndPointUrl.toString()).then(response => {
            let message: string;
            if (response.status === 200) {
                message = browser.i18n.getMessage("saveDataSuccess");
            } else if (response.status === 400) {
                message = browser.i18n.getMessage("saveDataInvalid");
            } else if (response.status === 401) {
                message = browser.i18n.getMessage("saveDataUnauthorized");
            } else if (response.status === 500) {
                message = browser.i18n.getMessage("saveDataServerError");
            } else if (response.status === 503) {
                message = browser.i18n.getMessage("saveDataNotImplemented");
            } else {
                message = "An unexpected response was received! Status " + response.status;
                console.warn(response);
            }
            alert(message);
        }).catch(err => {
           console.error(err);
           alert(browser.i18n.getMessage("saveDataUnknownError"));
        }).then(() => {
            // Navigate current window for iOS compatibility
            if (lang === 'fr') {
                window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSd3R9pit99xe2ZQUdavidKjJsvD0220tITGJ3LuEewuYcCIVQ/viewform?usp=pp_url&entry.1541900668=" + request_uuid;
            }
            else {
                window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSdZJH8xi_cUQK8MdR3cty1wZVB08WLGozzdKmRZqG-2q9zRaA/viewform?usp=pp_url&entry.1541900668=" + request_uuid;
            }
        });
    } else {
        if (lang === 'fr') {
            window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSd3R9pit99xe2ZQUdavidKjJsvD0220tITGJ3LuEewuYcCIVQ/viewform?usp=pp_url";
        }
        else {
            window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSdZJH8xi_cUQK8MdR3cty1wZVB08WLGozzdKmRZqG-2q9zRaA/viewform?usp=pp_url";
        }
    }
});
