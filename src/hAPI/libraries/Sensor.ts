class Sensor {
  encoder:number;
  direction:number;
  encoder_resolution: number;
  encoder_offset: number;
  value: number;
  port:number;
  
  constructor(encoder?:number, direction?:number, offset?:number, resolution?:number, port?:number){
    this.encoder = encoder||0;
    this.direction = direction||0;
    this.encoder_offset = offset||0;
    this.encoder_resolution = resolution||0;
    this.value = 0;
    this.port = port||0;
  }

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
