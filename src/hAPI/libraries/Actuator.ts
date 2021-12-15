class Actuator {

  actuator: number | undefined;
  direction: number | undefined;
  actuatorPort: number | undefined;
  torque: number | undefined;

  constructor$0() {
    this.actuator = 0;
    this.direction = 0;
    this.actuatorPort = 0;
  }
  constructor$3(actuator:number, direction:number, port:number) {
    this.actuator = actuator;
    this.direction = direction;
    this.actuatorPort = port;
  }
  constructor(...args$:any) {
    switch (args$.length) {
      case 0:
        return this.constructor$0(...args$);
      case 3:
        return this.constructor$3(...args$);
    }
  }
  set_actuator(actuator:number) {
    this.actuator = actuator;
  }
  set_direction(direction:number) {
    this.direction = direction;
  }
  set_port(port:number) {
    this.actuatorPort = port;
  }
  set_torque(torque:number) {
    this.torque = torque;
  }
  get_actuator() {
    return this.actuator;
  }
  get_direction() {
    return this.direction;
  }
  get_port() {
    return this.actuatorPort;
  }
  get_torque() {
    return this.torque;
  }
}

export {Actuator}