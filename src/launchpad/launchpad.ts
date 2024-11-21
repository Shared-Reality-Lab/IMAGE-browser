import browser from "webextension-polyfill";
import 'bootstrap/dist/css/bootstrap.css';
import "./launchpad.scss";
import { TUTORIAL_PAGE } from "../config";
import { queryLocalisation } from "../utils";

let port = browser.runtime.connect();

// Set up localized names: getting all elements with class "localisation"
queryLocalisation();

window.onload = () => {
    // Update renderings label
    let launchpadTitle = document.getElementById("popUpTitle");
    if (launchpadTitle) {
        if (process.env.NODE_ENV == "test" && process.env.SUFFIX_TEXT){
            launchpadTitle.textContent += process.env.SUFFIX_TEXT
        }
    }

    // /** Add button Labels */
    // document.querySelector("#tutorial-btn")!.innerHTML = browser.i18n.getMessage("tutorialLaunchPad");
    // document.querySelector("#local-file-btn")!.innerHTML = browser.i18n.getMessage("localFileLaunchPad");
    // document.querySelector("#options-btn")!.innerHTML = browser.i18n.getMessage("optionsLaunchPad");

    /** Add event listeners */
    document.getElementById("optionsLaunchPad")?.addEventListener("click", () =>{
        browser.runtime.openOptionsPage();
    });
    document.getElementById("tutorialLaunchPad")?.addEventListener("click",() => {
        browser.tabs.create({
            url: TUTORIAL_PAGE
        });
    });
    document.getElementById("tactileAuthoringTool")?.addEventListener("click",() => {
        browser.tabs.create({
            url: "http://localhost:8000/src/editor/index.html"
        });
    });
    document.getElementById("localFileLaunchPad")?.addEventListener("click", () =>{
        let fileInput = <HTMLInputElement>document.getElementById("selected-file");
        fileInput.click();
        fileInput.addEventListener("change", function(event){
            let target = event.target as HTMLInputElement;
            let selectedFile = target?.files![0] as File;
            let imgElement = document.getElementById("uploaded-image") as HTMLImageElement;

            if (selectedFile && imgElement) {
                //imgElement.src = URL.createObjectURL(selectedFile)
                const reader = new FileReader();
                reader.addEventListener(
                    "load",
                    () => {
                      // convert image file to base64 string
                      imgElement.src = reader.result as string;
                    },
                    false
                  );
                  reader.readAsDataURL(selectedFile);
            }
            let selectedFileContainer = document.getElementById("selected-file-container");
            document.getElementById("selected-file-container")!.style.display = "flex";
        });
    });

    document.getElementById("getRenderingLocalFile")?.addEventListener("click", () => {
        let selectedElement = document.getElementById("uploaded-image") as HTMLImageElement;
        const serializer = new XMLSerializer();

        port.postMessage({
            "type": "localResource",
            "context": selectedElement ? serializer.serializeToString(selectedElement) : null,
            "dims": [ selectedElement.naturalWidth, selectedElement.naturalHeight ],
            "image": selectedElement,
            "graphicBlob": selectedElement.src,
            "toRender": "full"
        });
    })

}

