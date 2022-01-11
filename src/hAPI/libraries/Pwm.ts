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
class Pwm {
  pin: number;
  value: number;

  constructor(pin?: number, pulseWidth?: number) {
    this.pin = pin || 0;
    if (pulseWidth || 0 > 100.0) {
      this.value = 255;
    } else {
      this.value = (pulseWidth || 0 * 255 / 100);
    }
  }

  set_pin(pin: number) {
    this.pin = pin;
  }
  set_pulse(percent: number) {
    if (percent > 100.0) {
      this.value = 255;
    } else {
      if (percent < 0) {
        this.value = 0;
      } else {
        this.value = (percent * 255 / 100);
      }
    }
  }

  get_pin() {
    return this.pin;
  }

  get_value() {
    return this.value;
  }

  get_pulse() {
    if (this.value != undefined) {
      let percent = this.value * 100 / 255;
      return percent;
    } else
      return -1;
  }
}

export { Pwm }
