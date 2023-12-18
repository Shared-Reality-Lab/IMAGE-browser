class Vector {
  x: number = 0;
  y: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

  }
  negative() {
    return new Vector(-this.x, -this.y);
  }
  add(v: any) {
    if (v instanceof Vector) return new Vector(this.x + v.x, this.y + v.y);
    else return new Vector(this.x + v, this.y + v);
  }

  subtract(v: any) {
    if (v instanceof Vector) return new Vector(this.x - v.x, this.y - v.y);
    else return new Vector(this.x - v, this.y - v);
  }

  multiply(v: any) {
    if (v instanceof Vector) return new Vector(this.x * v.x, this.y * v.y);
    else return new Vector(this.x * v, this.y * v);
  }

  divide(v: any) {
    if (v instanceof Vector) return new Vector(this.x / v.x, this.y / v.y);
    else return new Vector(this.x / v, this.y / v);
  }
  equals(v: Vector) {
    return this.x == v.x && this.y == v.y;
  }
  dot(v: Vector) {
    return this.x * v.x + this.y * v.y;
  }

  // cross(v:Vector) {
  //   return new Vector(
  //     this.y * v.z - this.z * v.y,
  //     this.z * v.x - this.x * v.z,
  //     this.x * v.y - this.y * v.x
  //   );
  // }

  length() {
    return Math.sqrt(this.dot(this));
  }
  unit() {
    return this.divide(this.length());
  }
  min() {
    return Math.min(this.x, this.y);
  }
  max() {
    return Math.max(this.x, this.y);
  }
  dist(v: Vector) {
    return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2));
  }
  normalize() {
    let len = this.mag();

    if (len !== 0) {
      this.x = this.x / len;
      this.y = this.y / len;

    }

    return this;
  }
  // toAngles() {
  //   return {
  //     // theta: Math.atan2(this.z, this.x),
  //     phi: Math.asin(this.y / this.length())
  //   };
  // }
  // angleTo(a:number) {
  //   return Math.acos(this.dot(a) / (this.length() * a.length()));
  // }
  toArray(n?: number) {
    return [this.x, this.y].slice(0, n || 3);
  }
  clone() {
    return new Vector(this.x, this.y);
  }
  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  set(x: any, y?: number) {
    if (x instanceof Vector) {
      this.x = x.x || 0;
      this.y = x.y || 0;
      return this;
    }
    if (x instanceof Array) {
      this.x = x[0] || 0;
      this.y = x[1] || 0;
      return this;
    }
    this.x = x || 0;
    this.y = y || 0;
    return this;
  }

  // Multiply a vector by a scalar
  mult (n:number){
    return new Vector(n * this.x, n * this.y);
  };

  // /* Rotate a 2D vector by 90 degrees*/
  rotateby90Deg (){
    //console.log("rotate called");
    return new Vector(-this.y, this.x);
  }
  
  rotate(angle: number){
    //console.log("rotate called", angle);
    let existingHeading = Math.atan2(this.y, this.x);
    let newHeading = existingHeading + angle;
    //if (this.isPInst) newHeading = this._toRadians(newHeading);
    const mag = this.mag();
    this.x = Math.cos(newHeading) * mag;
    this.y = Math.sin(newHeading) * mag;
    return new Vector(this.x,this.y);
  }
  // // Set magnitude - code used from p5js
  // // https://github.com/processing/p5.js/blob/main/src/math/p5.Vector.js#L1521
  setMag (n:number){
    return this.normalize().mult(n);
  }
  init(x: number, y: number) {
    this.x = x; this.y = y;
    return this;
  }

}

export { Vector }

