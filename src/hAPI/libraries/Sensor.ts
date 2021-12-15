class Sensor {
  encoder:number| undefined;
  direction:number |undefined;
  encoder_resolution: number |undefined;
  encoder_offset: number|undefined;
  value: number| undefined;
  port:number|undefined;


  constructor(encoder?:number, direction?:number, offset?:number, resolution?:number, port?:number){
    this.encoder = encoder||0;
    this.direction = direction||0;
    this.encoder_offset = offset||0;
    this.encoder_resolution = resolution||0;
    this.port = port||0;

  }

  // constructor$0() {
  //   this.encoder = 0;
  //   this.direction = 0;
  //   this.encoder_resolution = 0;
  //   this.encoder_offset = 0;
  //   this.value = 0;
  //   this.port = 0;
  // }

  // constructor$5(encoder:number, direction:number, offset:number, resolution:number, port:number) {
  //   this.encoder = encoder;
  //   this.direction = direction;
  //   this.encoder_offset = offset;
  //   this.encoder_resolution = resolution;
  //   this.port = port;
  // }

  // constructor(...args$:any[]) {
  //   switch (args$.length) {
  //     case 0:
  //       return this.constructor$0(...args$);
  //     case 5:
  //       return this.constructor$5(...args$);
  //   }
  // }
  set_encoder(encoder:number) {
    this.encoder = encoder;
  }
  set_direction(direction:number) {
    this.direction = direction;
  }
  set_offset(offset:number) {
    this.encoder_offset = offset;
  }
  set_resolution(resolution:number) {
    this.encoder_resolution = resolution;
  }
  set_port(port:number) {
    this.port = port;
  }
  set_value(value:number) {
    this.value = value;
  }
  get_encoder() {
    return this.encoder;
  }
  get_direction() {
    return this.direction;
  }
  get_offset() {
    return this.encoder_offset;
  }
  get_resolution() {
    return this.encoder_resolution;
  }
  get_port() {
    return this.port;
  }
  get_value() {
    return this.value;
  }
}

export {Sensor}
