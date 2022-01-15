/*
 * Copyright (c) 2021 IMAGE Project, Shared Reality Lab, McGill University
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * and our Additional Terms along with this program.
 * If not, see <https://github.com/Shared-Reality-Lab/IMAGE-browser/LICENSE>.
 *
 * This is based on the hAPI library by Haply Robotics <https://gitlab.com/Haply/hAPI>.
 */
class Actuator {

  actuator: number;
  direction: number;
  actuatorPort: number;
  torque: number = 0;

  constructor(actuator?: number, direction?: number, port?: number) {
    this.actuator = actuator || 0;
    this.direction = direction || 0;
    this.actuatorPort = port || 0;
  }

  set_actuator(actuator: number) {
    this.actuator = actuator;
  }
  set_direction(direction: number) {
    this.direction = direction;
  }
  set_port(port: number) {
    this.actuatorPort = port;
  }
  set_torque(torque: number) {
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

export { Actuator }
