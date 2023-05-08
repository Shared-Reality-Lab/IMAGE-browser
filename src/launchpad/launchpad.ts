import browser from "webextension-polyfill";
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import "./launchpad.scss";
import { TUTORIAL_PAGE } from "../config";

let port = browser.runtime.connect();


window.onload = ()=>{

    // Update renderings label
    let title = document.getElementById("launchpad-title");
    if (title) {
        //console.log(process.env);
        title.textContent = browser.i18n.getMessage("popUpTitle");
        //console.log("extVersion from info", process.env.NODE_ENV);
        if (process.env.NODE_ENV == "test" && process.env.SUFFIX_TEXT){
            title.textContent += process.env.SUFFIX_TEXT
        }
    }

    /** Add button Labels */
    document.querySelector("#tutorial-btn")!.innerHTML = browser.i18n.getMessage("tutorialLaunchPad");
    document.querySelector("#local-file-btn")!.innerHTML = browser.i18n.getMessage("localFileLaunchPad");
    document.querySelector("#options-btn")!.innerHTML = browser.i18n.getMessage("optionsLaunchPad");

    /** Add event listeners */
    document.getElementById("options-btn")?.addEventListener("click",function(){
        browser.runtime.openOptionsPage();
    });
    document.getElementById("tutorial-btn")?.addEventListener("click",function(){
        browser.tabs.create({
            url: TUTORIAL_PAGE
        });
    });
    


    document.getElementById("local-file-btn")?.addEventListener("click",function(){
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

    document.getElementById("get-rendering-local-file")?.addEventListener("click", function(event){
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

