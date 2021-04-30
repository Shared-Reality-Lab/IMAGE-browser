import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import { v4 as uuidv4 } from 'uuid';

let encodedRenderings = window.location.search.substring(1);
let renderings = JSON.parse(decodeURIComponent(encodedRenderings));
console.debug(renderings);

let count = 1;
for (let rendering of renderings["renderings"]) {
    let container = document.createElement("section");
    container.classList.add("container");
    let labelButton = document.createElement("button");
    let contentId = "m-" + uuidv4();
    labelButton.classList.add("btn", "btn-primary");
    labelButton.setAttribute("type", "button");
    labelButton.setAttribute("data-bs-toggle", "collapse");
    labelButton.setAttribute("data-bs-target", "#" + contentId);
    labelButton.setAttribute("aria-expanded", "false");
    labelButton.setAttribute("aria-controls", contentId);
    labelButton.textContent = "Rendering " + count + ": " + rendering["text_string"];
    container.append(labelButton);

    let details = rendering["metadata"]["more_details_rendering"];
    if (details["metadata"]["type_id"] === "c640f825-6192-44ce-b1e4-dd52e6ce6c63") {
        // Audio/Haptic
        let div = document.createElement("div");
        div.classList.add("row");
        container.append(div);
        let contentDiv = document.createElement("div");
        contentDiv.classList.add("collapse");
        contentDiv.id = contentId;
        div.append(contentDiv);
        if (details["metadata"]["description"]) {
            let p = document.createElement("p");
            p.textContent = details["metadata"]["description"];
            contentDiv.append(p);
        }
        if (details["audio_url"]) {
            let audio = document.createElement("audio");
            audio.setAttribute("controls", "");
            audio.setAttribute("src", details["audio_url"]);
            contentDiv.append(audio);
        }
    }
    document.body.append(container);
    count++;
}
