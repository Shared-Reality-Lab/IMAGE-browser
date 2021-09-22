class Sensor {
  constructor$0() {
    this.encoder = 0;
    this.direction = 0;
    this.encoder = 0;
    this.encoder_offset = 0;
    this.value = 0;
    this.port = 0;
  }

  constructor$5(encoder, direction, offset, resolution, port) {
    this.encoder = encoder;
    this.direction = direction;
    this.encoder_offset = offset;
    this.encoder_resolution = resolution;
    this.port = port;
  }

  constructor(...args$) {
    switch (args$.length) {
      case 0:
        return this.constructor$0(...args$);
      case 5:
        return this.constructor$5(...args$);
    }
  }
  set_encoder(encoder) {
    this.encoder = encoder;
  }
  set_direction(direction) {
    this.direction = direction;
  }
  set_offset(offset) {
    this.encoder_offset = offset;
  }
  set_resolution(resolution) {
    this.encoder_resolution = resolution;
  }
  set_port(port) {
    this.port = port;
  }
  set_value(value) {
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
