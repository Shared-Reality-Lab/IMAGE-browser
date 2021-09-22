
class Pantograph //extends Mechanisms
{

    
    constructor(){
        this.l = 0.07;
        this.L = 0.09;
        this.d = 0.00;
	
        this.th1 = 0;
        this.th2 = 0;
        this.tau1 = 0;
        this.tau2 = 0;
        this.f_x = 0;
        this.f_y = 0;
        this.x_E = 0;
        this.y_E = 0;
        
        this.pi = 3.14159265359;
        this.JT11 = 0;
        this.JT12 = 0;
        this.JT21 = 0;
        this.JT22 = 0;
        this.gain = 1.0;      
    }

    torqueCalculation(force){
        this.f_x = force[0];
		this.f_y = force[1];

        //console.log(this.f_x, this.f_y);
    
        this.tau1 = this.JT11*this.f_x + this.JT12*this.f_y;
		this.tau2 = this.JT21*this.f_x + this.JT22*this.f_y;
		
		this.tau1 = this.tau1*this.gain;
		this.tau2 = this.tau2*this.gain;
    }

    forwardKinematics(angles){

    let l1 = this.l;
    let l2 = this.l;
    let L1 = this.L;
    let L2 = this.L;
    
    this.th1 = (this.pi/180)* angles[0];
    this.th2 = (this.pi/180)* angles[1];

    //console.log("th1: " + this.th1);
    //console.log("th2: " + this.th2);

    // Forward Kinematics
    let c1 = Math.cos(this.th1);
    let c2 = Math.cos(this.th2);
    let s1 = Math.sin(this.th1);
    let s2 = Math.sin(this.th2);

      //  console.log("c1: " + c1);
      //  console.log()

    let xA = l1*c1;
    let yA = l1*s1;
    let xB = this.d+l2*c2;
     
    let yB = l2*s2;
    let hx = xB-xA; 
    let hy = yB-yA; 

    //    console.log("hx: " + hx);
   //    console.log("hy: " + hy);

    let hh2 = Math.pow(hx,2) +  Math.pow(hy,2); 
   let hh = (hx * hx) + (hy * hy);

    //    console.log("hh: " + hh);
    //    console.log("hh pow: " + hh2);

    let hm = (Math.sqrt(hh));

    //console.log("hm: " + hm);
    
    let cB;
    let h1x;
    let h1y;

    if (hm == 0)
    {
        cB = 0;
        h1x = 0;
        h1y = 0;
    }
    else
    {
      //  cB = -(math.pow(L2,2) - math.pow(L1,2) - hh)/(2*L1*hm)
        cB = -1 * (((Math.pow(L2,2) - (Math.pow(L1,2)) - hh)) / (2*L1*hm));      
        h1x = L1*cB * hx/hm; 
        h1y = L1*cB * hy/hm; 
    }

    // console.log("h1x: " + h1x);
    // console.log("h1y: " + h1y);
    // console.log("cB: " + cB);

    let h1h1 = Math.pow(h1x,2) + Math.pow(h1y,2); 
    let h1m = Math.sqrt(h1h1); 
    let sB = Math.sqrt(1-Math.pow(cB,2)); 

    // console.log("L1: " + L1);
    // console.log("sB: " + sB);

    let lx;
    let ly;

   // console.log("h1m: " + h1m);

    if (h1m == 0)
    {
        lx = 0;
        ly = 0;
    }
    else
    {
        lx = -L1*sB*h1y/h1m; 
        ly = L1*sB*h1x/h1m; 
    }

    //console.log("lx: " + lx);
    //console.log("ly: " + ly);

    let x_P = xA + h1x + lx; 
    let y_P = yA + h1y + ly; 
     
    let phi1 = Math.acos((x_P-l1*c1)/L1);
    let phi2 = Math.acos((x_P-this.d-l2*c2)/L2);
     
    let c11 = Math.cos(phi1); 
    let s11 = Math.sin(phi1); 
    let c22 = Math.cos(phi2); 
    let s22 = Math.sin(phi2); 
  
    let dn = L1 *(c11 * s22 - c22 * s11); 

    let eta;
    let nu;

    if (dn == 0)
    {
        eta = 0;
        nu = 0;
    }
    else
    {
        eta = (-L1 * c11 * s22 + L1 * c22 * s11 - c1 * l1 * s22 + c22 * l1 * s1) / dn;
        nu = l2 * (c2 * s22 - c22 * s2)/dn;
    }
    
    this.JT11 = -L1 * eta * s11 - L1 * s11 - l1 * s1;
    this.JT12 = L1 * c11 * eta + L1 * c11 + c1 * l1;
    this.JT21 = -L1 * s11 * nu;
    this.JT22 = L1 * c11 * nu;

    this.x_E = x_P;
    this.y_E = y_P; 
    
    }

    forceCalculation(){
	}
	
	
	positionControl(){
	}
	
	
	inverseKinematics(){
	}
	
	
	set_mechanism_parameters(parameters){
		this.l = parameters[0];
		this.L = parameters[1];
		this.d = parameters[2];
	}
	
	
	set_sensor_data(data){
	}
	
	
	get_coordinate(){
		let temp = [this.x_E, this.y_E];
		return temp;
	}
	
	
	get_torque(){
		let temp = [this.tau1, this.tau2];
		return temp;
	}
	
	
	get_angle(){
		let temp = [this.th1, this.th2];
		return temp;
	}


}