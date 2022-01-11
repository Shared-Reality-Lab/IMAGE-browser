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
class Sensor {
  encoder: number;
  direction: number;
  encoder_resolution: number;
  encoder_offset: number;
  value: number;
  port: number;

  constructor(encoder?: number, direction?: number, offset?: number, resolution?: number, port?: number) {
    this.encoder = encoder || 0;
    this.direction = direction || 0;
    this.encoder_offset = offset || 0;
    this.encoder_resolution = resolution || 0;
    this.value = 0;
    this.port = port || 0;
  }

  set_encoder(encoder: number) {
    this.encoder = encoder;
  }
  set_direction(direction: number) {
    this.direction = direction;
  }
  set_offset(offset: number) {
    this.encoder_offset = offset;
  }
  set_resolution(resolution: number) {
    this.encoder_resolution = resolution;
  }
  set_port(port: number) {
    this.port = port;
  }
  set_value(value: number) {
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

export { Sensor }
