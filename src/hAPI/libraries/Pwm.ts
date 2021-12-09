class Pwm {
  constructor$0() {
    this.pin = 0;
    this.value = 0;
  }

  constructor$2(pin, pulseWidth) {
    this.pin = pin;
    if (pulseWidth > 100.0) {
      this.value = 255;
    } else {
      this.value = (pulseWidth * 255 / 100);
    }
  }
  constructor(...args$) {
    switch (args$.length) {
      case 0:
        return this.constructor$0(...args$);
      case 2:
        return this.constructor$2(...args$);
    }
  }
  set_pin(pin) {
    this.pin = pin;
  }
  set_pulse(percent) {
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
    let percent = this.value * 100 / 255;
    return percent;
  }
}

export {Pwm}
