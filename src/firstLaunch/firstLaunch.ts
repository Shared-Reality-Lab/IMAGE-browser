import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap';
import "./firstLaunch.scss";
import { queryLocalisation } from '../utils';

// Load localised labels
queryLocalisation();

window.onload = () =>{
    let closeButton = document.getElementById("closingButton");
    
    let title = document.getElementById("popUpTitle");
    if (title) {
        console.log("extVersion from info", process.env.NODE_ENV);
        if (process.env.NODE_ENV == "test" && process.env.SUFFIX_TEXT){
            title.textContent += process.env.SUFFIX_TEXT
        }
    }

    // Event listener on the close button
    closeButton?.addEventListener("click", () => {
        window.close();
    });
}