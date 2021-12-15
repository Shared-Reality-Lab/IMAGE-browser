class Actuator {

  actuator: number;
  direction: number;
  actuatorPort: number;
  torque: number = 0;

  constructor(actuator?:number, direction?:number, port?:number){
    this.actuator = actuator||0;
    this.direction = direction|| 0;
    this.actuatorPort = port|| 0;
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