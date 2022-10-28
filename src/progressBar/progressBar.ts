import progressbar from "progressbar.js"

var ProgressBar = require('progressbar.js');
var bar = new ProgressBar.Line('#progress', {
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

window.onload = ()=>{
    let audio = new Audio('./audio-files/image_request_sent.mp3');
    audio.play();
}

var audio = new Audio('./audio-files/earcon_server_communication_IMAGE_processing-data.mp3');
setInterval(function(){
	audio.play();
}, 3000);


