import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import { browser } from "webextension-polyfill-ts";
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
let posBall: any;
let posEE: any;
let deviceOrigin: any;

port.onMessage.addListener(async (message) => {
    if (message) {
        renderings = message;
    } else {
        renderings = { "request_uuid": request_uuid, "timestamp": 0, "renderings": [] };
    }
    //console.log(renderings);

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

        if (rendering["type_id"] === "ca.mcgill.a11y.image.renderer.SimpleHaptics") {
            const text = rendering["data"]["data"][0]["text"] as string;

            console.log(text);
            let div = document.createElement("div");
            div.classList.add("row");
            container.append(div);
            let contentDiv = document.createElement("div");
            contentDiv.classList.add("collapse");
            contentDiv.classList.add("rendering-content");
            contentDiv.id = contentId;
            div.append(contentDiv);

            const p = document.createElement("p");
            p.textContent = text;
            contentDiv.append(p);

            let btn = document.createElement("button");
            btn.id = "btn";
            btn.innerHTML = "Play Haptic Rendering";
            contentDiv.append(btn);

            let worker;
            
            const worldPixelWidth = 1000;
            const pixelsPerMeter = 4000.0;
            const radsPerDegree = 0.01745;

            posBall = {
                x: 0,
                y: 0
            };

            posEE = {
                x: 0,
                y: 0
            };

            deviceOrigin = {
                x: worldPixelWidth / 2,
                y: 0
            };

            canvas = document.createElement('canvas');
            canvas.id = "main";
            canvas.width = 800;
            canvas.height = 500;
            canvas.style.zIndex = "8";
            canvas.style.position = "absolute";
            canvas.style.border = "1px solid";
            canvas.style.left = "100px";
            canvas.style.top = "300px";  
            
            contentDiv.append(canvas);

            ctx = canvas.getContext('2d');

            ball = {
                x: 100,
                y: 100,
                vx: 5,
                vy: 2,
                radius: 25,
                color: 'blue',
                draw: function() {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.fillStyle = this.color;
                    ctx.fill();
                }
            };

            border = {
                draw: function() {
                    ctx.strokeRect(0, 0, canvas.width, canvas.height);
                }
            };

            box = {
                draw:function() {
                    ctx.strokeRect(140,70,canvas.width-310, canvas.height-200);
                }
            }

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

            ball.draw();
            border.draw();
            box.draw();
            endEffector.draw();

            // serial comms
            btn.addEventListener("click", _ => {
                const worker = new Worker(browser.runtime.getURL("./info/worker.js"), {type: "module"});
                let port = navigator.serial.requestPort();
                worker.addEventListener("message", function(msg){

                    posEE.x = msg.data.positions.x;
                    posEE.y = msg.data.positions.y;
                    posBall.x = msg.data.posBall.x;
                    posBall.y = msg.data.posBall.y;
            
                });
            });
        }
        document.body.append(container);
        count++;
    }
});

function draw() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    updateAnimation();
    checkBounds();
   
    raf = window.requestAnimationFrame(draw);
  }

function checkBounds(){
    if (ball.y + ball.vy > canvas.height ||
        ball.y + ball.vy < 0) {
      ball.vy = -ball.vy;
    }
    if (ball.x + ball.vx > canvas.width ||
        ball.x + ball.vx < 0) {
      ball.vx = -ball.vx;
    }
  
    if (endEffector.y + endEffector.vy > canvas.height ||
      endEffector.y + endEffector.vy < 0) {
    endEffector.vy = -endEffector.vy;
    }
    if (endEffector.x + endEffector.vx > canvas.width ||
        endEffector.x + endEffector.vx < 0) {
      endEffector.vx = -endEffector.vx;
    }
  
  }

function updateAnimation(){
    border.draw();
    box.draw();
    xE = posEE.x;
    yE = posEE.y;
    xB = posBall.x;
    yB = posBall.y;
  
    xE = pixelsPerMeter * -xE;
    yE = pixelsPerMeter * yE;
  
    //update ball
  
    ball.x = deviceOrigin.x + xB * -pixelsPerMeter-x_trans;
    ball.y = deviceOrigin.y + yB * pixelsPerMeter;
    ball.draw();
      
  
    //update endEffector
    endEffector.x = deviceOrigin.x + xE - x_trans;
    endEffector.y = deviceOrigin.y + yE;
    endEffector.draw();
  }

port.postMessage({
    "type": "info",
    "request_uuid": request_uuid
});
