import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import "./firstLaunch.scss";

import browser from "webextension-polyfill";

window.onload = () =>{
    let closeButton = document.getElementById("close-button");
    
    let title = document.getElementById("firstlaunch-title");
    if (title) {
        //console.log(process.env);
        title.textContent = browser.i18n.getMessage("popUpTitle");
        //console.log("extVersion from info", process.env.NODE_ENV);
        if (process.env.NODE_ENV == "test" && process.env.SUFFIX_TEXT){
            title.textContent += process.env.SUFFIX_TEXT
        }
    }

    closeButton?.addEventListener("click", function(){
        window.close();
    });
}