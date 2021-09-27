const p5 = require('node-p5');
console.log("running sketch");

function sketch(p) {
    p.setup = () => {
        let canvas = p.createCanvas(200, 200);
        setTimeout(() => {
            p.saveCanvas(canvas, 'myCanvas', 'png').then(filename => {
                console.log(`saved the canvas as ${filename}`);
            });
        }, 100);
    }
    p.draw = () => {
        console.log("draw");
        p.background(50);
        p.text('hello world!', 50, 100);
    }
}

let p5Instance = p5.createSketch(sketch);

// console.log("abc");

// function setup() {
//   createCanvas(600, 600);
//   console.log("sketch setup");
//   alert('test');
// }

// function draw() {
//   //hello_ball.background(120);
//   console.log("sketch looping");
// }

// //var myp5 = new p5(s);
// console.log("sketch started");
//alert('test 2');

// var haplyBoard;
// var widgetOne;
// var pantograph;
// var worker;

// var widgetOneID = 5;
// var CW = 0;
// var CCW = 1;
// var renderingForce= false;

// /* framerate definition ************************************************************************************************/
// var baseFrameRate= 120;
// /* end framerate definition ********************************************************************************************/ 

// /* elements definition *************************************************************************************************/

// /* Screen and world setup parameters */
// var pixelsPerMeter = 4000.0;
// var radsPerDegree = 0.01745;

// /* pantagraph link parameters in meters */
// var l = 0.07; // m
// var L = 0.09; // m


// /* end effector radius in meters */
// var rEE = 0.006;
// var rEEContact = 0.006;

// /* virtual ball parameters  */
// var rBall = 0.02;

// var mBall = 0.15;  // kg
// var kBall = 445;  // N/m
// var bBall = 3.7;
// var penBall = 0.0;  // m
// var bAir = 0.0;  // kg/s
// var fGravity = new p5.Vector(0, 9.8*mBall);
// var dt = 1/1000.0;

// var posBall = new p5.Vector(0, 0.05);  
// var velBall                             = new p5.Vector(0, 0);    

// var fBall = new p5.Vector(0 ,0);    
// var fContact = new p5.Vector(0, 0);
// var fDamping = new p5.Vector(0, 0);

// var posEEToBall;
// var posEEToBallMagnitude;

// var velEEToBall;
// var velEEToBallMagnitude;

// /* virtual wall parameters */
// var fWall = new p5.Vector(0, 0);
// var kWall = 800; // N/m
// var bWall = 2; // kg/s
// var penWall = new p5.Vector(0, 0);

// var posWallLeft = new p5.Vector(-0.07, 0.03);
// var posWallRight = new p5.Vector(0.07, 0.03);
// var posWallBottom = new p5.Vector(0.0, 0.1);

// /* generic data for a 2DOF device */
// /* joint space */
// var angles                              = new p5.Vector(0, 0);
// var torques                             = new p5.Vector(0, 0);

// /* task space */
// var posEE                               = new p5.Vector(0, 0);
// var posEELast                           = new p5.Vector(0, 0);
// var velEE                               = new p5.Vector(0, 0);

// var fEE                                 = new p5.Vector(0, 0); 

// /* device graphical position */
// var deviceOrigin                        = new p5.Vector(0, 0);

// /* World boundaries reference */
// const worldPixelWidth                     = 1000;
// const worldPixelHeight                    = 650;

// /* graphical elements */
// var pGraph, joint, endEffector;
// var ball;
// var leftWall;
// var bottomWall;
// var rightWall;

// /* end elements definition *********************************************************************************************/ 


// function setup() {
//     createCanvas(1200, 1200);

//     /* visual elements setup */
//     //background(0);
//     deviceOrigin.add(worldPixelWidth/2, 0);
    
//     /* create pantagraph graphics */
//     create_pantagraph();
//   }
  
//    function draw() {

//      /* put graphical code here, runs repeatedly at defined framerate in setup, else default at 60fps: */
//      //  if(renderingForce == false){
//          background(255);  
//           update_animation(this.angles.x*radsPerDegree, 
//                             this.angles.y*radsPerDegree, 
//                             this.posEE.x, 
//                             this.posEE.y);
//      //  }
//    }



// async function workerSetup(){
//     let port = await navigator.serial.requestPort();
//     worker.postMessage("test");
// }

// if (window.Worker) {
//     // console.log("here");
//     worker = new Worker("hello_ball_worker.js");
//     document.getElementById("button").addEventListener("click", workerSetup);
//     worker.addEventListener("message", function(msg){

//         //retrieve data from worker.js needed for update_animation()
//         //TODO: find a more elegant way to retrieve the variables
//         angles.x = msg.data[0];
//         angles.y = msg.data[1];
//         posEE.x = msg.data[2];
//         posEE.y = msg.data[3];
//         posBall.x = msg.data[4].x;
//         posBall.y = msg.data[4].y;

//     });
    
// }
// else {
//     console.log("oops!");
// }

// /* helper functions section, place helper functions here ***************************************************************/
// function create_pantagraph(){
//     var lAni = pixelsPerMeter * l;
//     var LAni = pixelsPerMeter * L;
//     var rEEAni = pixelsPerMeter * rEE;

//      joint = ellipse(deviceOrigin.x, deviceOrigin.y, rEEAni, rEEAni)
//      joint.beginShape();
//      joint.endShape();
    
//     // endEffector = beginShape(ELLIPSE, deviceOrigin.x, deviceOrigin.y, 2*rEEAni, 2*rEEAni);
//   endEffector = ellipse(deviceOrigin.x, deviceOrigin.y, 2*rEEAni, 2*rEEAni)
    
//   }
  
  
// function create_wall(x1, y1, x2, y2){
//     x1 = pixelsPerMeter * x1;
//     y1 = pixelsPerMeter * y1;
//     x2 = pixelsPerMeter * x2;
//     y2 = pixelsPerMeter * y2;
    
//     // return beginShape(LINE, deviceOrigin.x + x1, deviceOrigin.y + y1, deviceOrigin.x + x2, deviceOrigin.y+y2);
//   return line(deviceOrigin.x + x1, deviceOrigin.y + y1, deviceOrigin.x + x2, deviceOrigin.y+y2);
//   }
  
  
// function create_ball(rBall){
//     rBall = pixelsPerMeter * rBall;
//   return ellipse(deviceOrigin.x, deviceOrigin.y + 200, 2*rBall, 2*rBall);
  
//   }
  
  
// function update_animation(th1, th2, xE, yE){

//     /* create left-side wall */
//     leftWall = create_wall(posWallLeft.x, posWallLeft.y, posWallLeft.x, posWallLeft.y+0.07);
//     leftWall.stroke(color(0));
    
//     /* create right-sided wall */
//     rightWall = create_wall(posWallRight.x, posWallRight.y, posWallRight.x, posWallRight.y+0.07);
//     rightWall.stroke(color(0));
    
//     /* create bottom wall */
//     bottomWall = create_wall(posWallBottom.x-0.07, posWallBottom.y, posWallBottom.x+0.07, posWallBottom.y);
//     bottomWall.stroke(color(0));

//     th1 = angles.x * (3.14 / 180);
//     th2 = angles.y * (3.14 / 180);
//     xE = posEE.x;
//     yE = posEE.y;

//     var lAni = pixelsPerMeter * l;
//     var LAni = pixelsPerMeter * L;
    
//     xE = pixelsPerMeter * -xE;
//     yE = pixelsPerMeter * yE;

//     th1 = 3.14 - th1;
//     th2 = 3.14 - th2;

//     var lAni = pixelsPerMeter * l;
//     var LAni = pixelsPerMeter * L;
//     var rEEAni = pixelsPerMeter * rEE;

//     joint = ellipse(deviceOrigin.x, deviceOrigin.y, rEEAni, rEEAni)
//     joint.stroke(color(0));

//     var v0x = deviceOrigin.x;
//     var v0y = deviceOrigin.y;
//     var v1x = deviceOrigin.x + lAni*cos(th1);
//     var v1y = deviceOrigin.y + lAni*sin(th1);
//     var v2x = deviceOrigin.x + xE;
//     var v2y = deviceOrigin.y + yE;
//     var v3x = deviceOrigin.x + lAni*cos(th2);
//     var v3y = deviceOrigin.y + lAni*sin(th2);

//    // background(255);
//     // p5.js doesn't seem to have setVertex, so the coordinates are set in order rather than using an index 
//     this.pGraph = beginShape();
//      this.pGraph.vertex(v0x, v0y);
//      this.pGraph.vertex(v1x, v1y);
//      this.pGraph.vertex(v2x, v2y);
//      this.pGraph.vertex(v3x, v3y);
    
//     this.pGraph.endShape(CLOSE);

//     this.ball = ellipse(deviceOrigin.x + posBall.x * -pixelsPerMeter, deviceOrigin.y + posBall.y * pixelsPerMeter, 160, 160);

//     translate(xE, yE);
    
//     endEffector = ellipse(deviceOrigin.x, deviceOrigin.y, 2*rEEAni, 2*rEEAni)
//     endEffector.beginShape();
//     endEffector.endShape();
//   }
  
  
// function device_to_graphics(deviceFrame){
//     return deviceFrame.set(-deviceFrame.x, deviceFrame.y);
//   }
  
  
// function graphics_to_device(graphicsFrame){
//     return graphicsFrame.set(-graphicsFrame.x, graphicsFrame.y);
//   }
//   /* end helper function ****************************************************************************************/