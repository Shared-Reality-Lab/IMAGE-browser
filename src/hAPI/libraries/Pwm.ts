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
