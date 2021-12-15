import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import Plyr from "plyr";
import "./info.scss";
import browser from "webextension-polyfill";
import { v4 as uuidv4 } from 'uuid';
import { IMAGEResponse } from "../types/response.schema";

let request_uuid = window.location.search.substring(1);
let renderings: IMAGEResponse;
let port = browser.runtime.connect();

//TODO: set types
let endEffector: any;
let ball: any;
let border: any;
let box: any;
let canvas: any;
let ctx: any;
let raf: any;
// let posBall: any;
let posEE: any;
let deviceOrigin: any;
let xB, yB, xE, yE:any;
let pg: any;
let x_trans = 100;
let names:string [] = [""];
let centroids:[Number,Number][] =[[0,0]];
let coords:[number,number,number,number][] =[[0,0,0,0]];
var canReceive = false;
let objectData: any;
var firstCall:boolean = true;
const canvas_width = 800;
const canvas_height = 500;

const audioCtx = new window.AudioContext();
port.onMessage.addListener(async (message) => {
    if (message) {
        renderings = message;
    } else {
        renderings = { "request_uuid": request_uuid, "timestamp": 0, "renderings": [] };
    }
    console.debug(renderings);
    canReceive = true;

    // Update renderings label
    let title = document.getElementById("renderingTitle");
    if (title) {
        title.textContent = browser.i18n.getMessage("renderingTitle");
    }

    let label = browser.i18n.getMessage("renderingLabel");

    let count = 1;
    for (let rendering of renderings["renderings"]) {
        let container = document.createElement("section");
        container.classList.add("container");
        container.classList.add("rendering");
        let labelButton = document.createElement("button");
        let contentId = "m-" + uuidv4();
        labelButton.classList.add("btn", "btn-primary");
        labelButton.setAttribute("type", "button");
        labelButton.setAttribute("data-bs-toggle", "collapse");
        labelButton.setAttribute("data-bs-target", "#" + contentId);
        labelButton.setAttribute("aria-expanded", "false");
        labelButton.setAttribute("aria-controls", contentId);
        labelButton.textContent = label + " " + count + ": " + rendering["description"];
        container.append(labelButton);

        if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.Text") {
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);
            const text = rendering["data"]["text"] as string;
            const p = document.createElement("p");
            p.textContent = text;
            contentDiv.append(p);
        }
        else if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.SimpleAudio") {
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);
            const audio = document.createElement("audio");
            audio.setAttribute("controls", "");
            audio.setAttribute("src", rendering["data"]["audio"] as string);
            contentDiv.append(audio);
            const download = document.createElement("a");
            download.setAttribute("href", rendering["data"]["audio"] as string);
            download.textContent = "Download Audio File";
            contentDiv.append(download);
        }
        else if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.SegmentAudio") {
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);
            const selectDiv = document.createElement("div");
            selectDiv.classList.add("form-floating");
            contentDiv.append(selectDiv);
            const label = document.createElement("label");
            label.textContent = browser.i18n.getMessage("segmentAudioSelLabel");
            label.classList.add("form-label");
            const select = document.createElement("select");
            select.classList.add("form-select");
            select.setAttribute("id", "m-" + uuidv4());
            label.setAttribute("for", select.id);
            const fullOption = document.createElement("option");
            fullOption.setAttribute("value", "full");
            fullOption.setAttribute("selected", "true");
            fullOption.textContent = browser.i18n.getMessage("segmentAudioFullRendering");
            select.append(fullOption);
            const audioInfo = rendering["data"]["audioInfo"] as { "name": string, "offset": number, "duration": number }[];
            for (let idx = 0; idx < audioInfo.length; idx++) {
                const opt = document.createElement("option");
                opt.setAttribute("value", idx.toString());
                const val = audioInfo[idx];
                opt.textContent = val["name"];
                select.append(opt);
            }
            selectDiv.append(select);
            selectDiv.append(label);

            const button = document.createElement("button");
            button.textContent = browser.i18n.getMessage("segmentAudioButton");
            button.classList.add("btn", "btn-secondary");
            selectDiv.append(button);

            const audioBuffer = await fetch(rendering["data"]["audioFile"] as string).then(resp => {
                return resp.arrayBuffer();
            }).then(buffer => {
                return audioCtx.decodeAudioData(buffer);
            }).catch(e => { console.error(e); throw e; });

            let currentOffset: number|undefined;
            let currentDuration: number|undefined;

            select.addEventListener("input", (e) => {
                const evt = e as InputEvent;
                const target = evt.target as HTMLSelectElement;
                if (target.value === "full") {
                    currentOffset = undefined;
                    currentDuration = undefined;
                } else {
                    const idx = parseInt(target.value);
                    const data = audioInfo[idx];
                    currentOffset = data["offset"] as number;
                    currentDuration = data["duration"] as number;
                }
            });
            button.addEventListener("click", _ => {
                const sourceNode = audioCtx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioCtx.destination);
                sourceNode.start(0, currentOffset, currentDuration);
            });
        }

        if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.SimpleHaptics") {

             const imageSrc = rendering["data"]["image"] as string;
            const data = rendering["data"]["data"] as Array<JSON>;

            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);

            let btn = document.createElement("button");
            btn.id = "btn";
            btn.innerHTML = "Play Haptic Rendering";
            contentDiv.append(btn);

            const canvas:HTMLCanvasElement = document.createElement('canvas');
            canvas.id = "main";
            canvas.width = 800;
            canvas.height = 500;
            canvas.style.zIndex = "8";
            canvas.style.position = "absolute";
            canvas.style.border = "1px solid";
            contentDiv.append(document.createElement("br"));
            contentDiv.append(canvas);
            const res = canvas.getContext('2d');
            if (!res || !(res instanceof CanvasRenderingContext2D)) {
                throw new Error('Failed to get 2D context');
            }
            const ctx: CanvasRenderingContext2D = res;


            let worker;
            
            const worldPixelWidth = 1000;
            const worldPixelHeight = 600;
            const pixelsPerMeter = 4000.0;
            const radsPerDegree = 0.01745;

            const screenFactor_x = worldPixelWidth / pixelsPerMeter;
            const screenFactor_y = worldPixelHeight / pixelsPerMeter;


            posEE = {
                x: 0,
                y: 0
            };

            deviceOrigin = {
                x: worldPixelWidth / 2,
                y: 0
            };

            var img = new Image();
            img.src = imageSrc;

    

            border = {
                draw: function() {
                    ctx.strokeRect(0, 0, canvas.width, canvas.height);
                }
            };


            endEffector = {
                x: canvas.width/2,
                y: 25,
                vx: 5,
                vy: 2,
                radius: 15,
                color: 'black',
                draw: function() {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.fillStyle = this.color;
                    ctx.fill();
                }

            };

            function draw() {
                ctx.clearRect(0,0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0,canvas.width, canvas.height);
                updateAnimation();
                raf = window.requestAnimationFrame(draw);
              }


              var rec:Array<any> = [];
              function create_rect()   {
                for (var i = 0; i < objectData.length; i++) {
                    let [ulx, uly] = to_haply_frame(objectData[i].coords[0], objectData[i].coords[1]); 
                    let [lrx, lry] = to_haply_frame(objectData[i].coords[2], objectData[i].coords[3]);
                    let objWidth = Math.abs(ulx-lrx);
                    let objHeight = Math.abs(uly-lry);
                    rec.push({
                        x:ulx,
                        y:uly,
                        width:objWidth,
                        height:objHeight,

                    });    
                }      
              }

              function draw_rect(){
                for(var i=0;i<rec.length;i++){
                    var s=rec[i];
                    ctx.strokeStyle="red";
                    ctx.strokeRect(s.x,s.y,s.width,s.height);
                }   
              }

              function updateAnimation(){

            
                draw_rect();
                border.draw();
                xE = posEE.x;
                yE = posEE.y;
        

                xE = pixelsPerMeter * -xE;
                yE = pixelsPerMeter * yE;

                endEffector.x = deviceOrigin.x +xE-x_trans;
                endEffector.y = deviceOrigin.y+yE;
                endEffector.draw();
             
              }

            endEffector.draw();
    
            // serial comms
            btn.addEventListener("click", _ => {
                const worker = new Worker(browser.runtime.getURL("./info/worker.js"), {type: "module"});
                let port = navigator.serial.requestPort();
                if(canReceive){
                    worker.postMessage(data);
                    canReceive = false;
                }
                
               
                worker.addEventListener("message", function(msg){
 
                    posEE.x = msg.data.positions.x;
                    posEE.y = msg.data.positions.y;
                    objectData = msg.data.objectData;

                    if(firstCall){
                        create_rect();
                        raf = window.requestAnimationFrame(draw);
                        firstCall = false;
                    }
                    
                });
            });

        }        

        document.body.append(container);
        count++;
    }
    Array.from(document.getElementsByTagName("audio")).map(i => new Plyr(i));
});

port.postMessage({
    "type": "info",
    "request_uuid": request_uuid
});


function to_haply_frame(x1:number, y1:number) {
    var x = x1 *canvas_width;
    var y = y1  *canvas_height;
    return [x,y];
  }

