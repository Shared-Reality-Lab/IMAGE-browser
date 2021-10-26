var haplyBoard;
var widgetOne;
var pantograph;
var worker;

var widgetOneID = 5;
var CW = 0;
var CCW = 1;
var renderingForce = false;

/* framerate definition ************************************************************************************************/
var baseFrameRate = 120;
/* end framerate definition ********************************************************************************************/ 

/* elements definition *************************************************************************************************/

/* Screen and world setup parameters */
var pixelsPerMeter = 4000.0;
var radsPerDegree = 0.01745;

/* pantagraph link parameters in meters */
var l = 0.07; // m
var L = 0.09; // m


/* end effector radius in meters */
var rEE = 0.006;
var rEEContact = 0.006;

/* virtual ball parameters  */
var rBall = 0.02;

var mBall = 0.15;  // kg
var kBall = 445;  // N/m
var bBall = 3.7;
var penBall = 0.0;  // m
var bAir = 0.0;  // kg/s
var fGravity = new p5.Vector(0, 9.8*mBall);
var dt = 1/1000.0;

var posBall = new p5.Vector(0, 0.05);  
var velBall                             = new p5.Vector(0, 0);    

var fBall = new p5.Vector(0 ,0);    
var fContact = new p5.Vector(0, 0);
var fDamping = new p5.Vector(0, 0);

var posEEToBall;
var posEEToBallMagnitude;

var velEEToBall;
var velEEToBallMagnitude;

/* virtual wall parameters */
var fWall = new p5.Vector(0, 0);
var kWall = 800; // N/m
var bWall = 2; // kg/s
var penWall = new p5.Vector(0, 0);

var posWallLeft = new p5.Vector(-0.07, 0.03);
var posWallRight = new p5.Vector(0.07, 0.03);
var posWallBottom = new p5.Vector(0.0, 0.1);

/* generic data for a 2DOF device */
/* joint space */
var angles                              = new p5.Vector(0, 0);
var torques                             = new p5.Vector(0, 0);

/* task space */
var posEE                               = new p5.Vector(0, 0);
var posEELast                           = new p5.Vector(0, 0);
var velEE                               = new p5.Vector(0, 0);

var fEE                                 = new p5.Vector(0, 0); 

/* device graphical position */
var deviceOrigin                        = new p5.Vector(0, 0);

/* World boundaries reference */
const worldPixelWidth                     = 1000;
const worldPixelHeight                    = 650;

/* graphical elements */
var pGraph, joint, endEffector;
var ball;
var leftWall;
var bottomWall;
var rightWall;

/* end elements definition *********************************************************************************************/ 

const s = (sketch) => {

    let x = 100;
    let y = 100;
  
    sketch.setup = () => {
      sketch.createCanvas(1200, 1200);

    /* visual elements setup */
    //background(0);
      deviceOrigin.add(worldPixelWidth/2, 0);
    
    /* create pantagraph graphics */
       sketch.create_pantagraph();
    };
  
    sketch.draw = () => {
        
     /* put graphical code here, runs repeatedly at defined framerate in setup, else default at 60fps: */
      if(renderingForce == false) {
         sketch.background(255);  
          sketch.update_animation(this.angles.x*radsPerDegree, 
                            this.angles.y*radsPerDegree, 
                            this.posEE.x, 
                            this.posEE.y);
      }
    };

    /* helper functions section, place helper functions here ***************************************************************/

    sketch.create_pantagraph =() => {
        var lAni = pixelsPerMeter * l;
        var LAni = pixelsPerMeter * L;
        var rEEAni = pixelsPerMeter * rEE;
    
         joint = sketch.ellipse(deviceOrigin.x, deviceOrigin.y, rEEAni, rEEAni)
         joint.beginShape();
         joint.endShape();
        
      // endEffector = beginShape(ELLIPSE, deviceOrigin.x, deviceOrigin.y, 2*rEEAni, 2*rEEAni);
      endEffector = sketch.ellipse(deviceOrigin.x, deviceOrigin.y, 2*rEEAni, 2*rEEAni)
        
    };

    sketch.create_wall = (x1, y1, x2, y2) =>{
        x1 = pixelsPerMeter * x1;
        y1 = pixelsPerMeter * y1;
        x2 = pixelsPerMeter * x2;
        y2 = pixelsPerMeter * y2;
        
        // return beginShape(LINE, deviceOrigin.x + x1, deviceOrigin.y + y1, deviceOrigin.x + x2, deviceOrigin.y+y2);
      return sketch.line(deviceOrigin.x + x1, deviceOrigin.y + y1, deviceOrigin.x + x2, deviceOrigin.y+y2);
    };
    
    sketch.create_ball= (rBall)=>{
        rBall = pixelsPerMeter * rBall;
      return sketch.ellipse(deviceOrigin.x, deviceOrigin.y + 200, 2*rBall, 2*rBall);
      
    };

    sketch.update_animation = (th1, th2, xE, yE) =>{

      console.log(xE, yE);

        /* create left-side wall */
        leftWall = sketch.create_wall(posWallLeft.x, posWallLeft.y, posWallLeft.x, posWallLeft.y+0.07);
        leftWall.stroke(sketch.color(0));
        
        /* create right-sided wall */
        rightWall = sketch.create_wall(posWallRight.x, posWallRight.y, posWallRight.x, posWallRight.y+0.07);
        rightWall.stroke(sketch.color(0));
        
        /* create bottom wall */
        bottomWall = sketch.create_wall(posWallBottom.x-0.07, posWallBottom.y, posWallBottom.x+0.07, posWallBottom.y);
        bottomWall.stroke(sketch.color(0));
    
        th1 = angles.x * (3.14 / 180);
        th2 = angles.y * (3.14 / 180);
        xE = posEE.x;
        yE = posEE.y;
    
        var lAni = pixelsPerMeter * l;
        var LAni = pixelsPerMeter * L;
        
        xE = pixelsPerMeter * -xE;
        yE = pixelsPerMeter * yE;
    
        th1 = 3.14 - th1;
        th2 = 3.14 - th2;
    
        var lAni = pixelsPerMeter * l;
        var LAni = pixelsPerMeter * L;
        var rEEAni = pixelsPerMeter * rEE;
    
        joint = sketch.ellipse(deviceOrigin.x, deviceOrigin.y, rEEAni, rEEAni)
        joint.stroke(sketch.color(0));
    
        var v0x = deviceOrigin.x;
        var v0y = deviceOrigin.y;
        var v1x = deviceOrigin.x + lAni*sketch.cos(th1);
        var v1y = deviceOrigin.y + lAni*sketch.sin(th1);
        var v2x = deviceOrigin.x + xE;
        var v2y = deviceOrigin.y + yE;
        var v3x = deviceOrigin.x + lAni*sketch.cos(th2);
        var v3y = deviceOrigin.y + lAni*sketch.sin(th2);
    
        // background(255);
        // p5.js doesn't seem to have setVertex, so the coordinates are set in order rather than using an index 
        this.pGraph = sketch.beginShape();
        this.pGraph.vertex(v0x, v0y);
        this.pGraph.vertex(v1x, v1y);
        this.pGraph.vertex(v2x, v2y);
        this.pGraph.vertex(v3x, v3y);
        
        this.pGraph.endShape(sketch.CLOSE);
    
        this.ball = sketch.ellipse(deviceOrigin.x + posBall.x * -pixelsPerMeter, deviceOrigin.y + posBall.y * pixelsPerMeter, 160, 160);
    
        sketch.translate(xE, yE);
        
        endEffector = sketch.ellipse(deviceOrigin.x, deviceOrigin.y, 2*rEEAni, 2*rEEAni)
        endEffector.beginShape();
        endEffector.endShape();
    };
      
  };
  
  let myp5 = new p5(s);

async function workerSetup(){
    let port = await navigator.serial.requestPort();
    worker.postMessage("test");
}

if (window.Worker) {
    worker = new Worker("hello_ball_worker.js");
    document.getElementById("button").addEventListener("click", workerSetup);
    worker.addEventListener("message", function(msg){

        angles.x = msg.data.angles.x;
        angles.y = msg.data.angles.y;
        posEE.x = msg.data.positions.x;
        posEE.y = msg.data.positions.y;
        posBall.x = msg.data.posBall.x;
        posBall.y = msg.data.posBall.y;

    });
    
}
else {
    console.log("Workers not supported.");
}



  
  

  

  
