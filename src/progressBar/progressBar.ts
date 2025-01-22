import progressbar from "progressbar.js";
import { queryLocalisation } from "../utils";
import './progressBar.css'
// Load localised title
queryLocalisation();

var bar = new progressbar.Line('#progress', {
    strokeWidth: 1,
    easing: 'easeInOut',
    duration: 10000,
    color: '#FFEA82',
    trailColor: '#eee',
    trailWidth: 1,
    from: {color: '#FFEA82'},
    to: {color: '#ED6A5A'},
    step: (state:any, bar:any) => {
        bar.path.setAttribute('stroke', state.color);
    }
});

bar.animate(1);

// Play Request Sent sound on load
window.onload = () => {
    let requestSentAudio = new Audio('../audio/IMAGE-RequestSent.mp3');
    requestSentAudio.play();
}

// Play Processing Data when waiting
let processingAudio = new Audio('../audio/IMAGE-Processing.mp3');
setInterval(function(){
	processingAudio.play();
}, 3000);


