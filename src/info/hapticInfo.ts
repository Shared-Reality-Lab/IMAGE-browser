import 'bootstrap';
import 'node-p5';
import 'bootstrap/dist/css/bootstrap.css';
import Plyr from "plyr";
import "./info.scss";
import { browser } from "webextension-polyfill-ts";
import { v4 as uuidv4 } from 'uuid';
import { IMAGEResponse } from "../types/response.schema";

let request_uuid = window.location.search.substring(1);
let renderings: IMAGEResponse;
let port = browser.runtime.connect();
port.onMessage.addListener(async (message) => {
    if (message) {
        renderings = message;
    } else {
        renderings = { "request_uuid": request_uuid, "timestamp": 0, "renderings": [] };
    }
    console.debug(renderings);

    // Update renderings label
    let title = document.getElementById("renderingTitle");
    if (title) {
        title.textContent = browser.i18n.getMessage("renderingTitle");
    }
        let container = document.createElement("section");
        document.body.append(container);
    }
});

port.postMessage({
    "type": "info",
    "request_uuid": request_uuid
});