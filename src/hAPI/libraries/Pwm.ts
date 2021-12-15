class Pwm {
  pin:number |undefined;
  value:number |undefined;

  constructor(pin?:number, pulseWidth?:number){
    this.pin = pin ||0;
    if (pulseWidth||0 > 100.0) {
      this.value = 255;
    } else {
      this.value = (pulseWidth||0 * 255 / 100);
    }

  }

  // constructor$0() {
  //   this.pin = 0;
  //   this.value = 0;
  // }

  // constructor$2(pin:number, pulseWidth:number) {
  //   this.pin = pin;
  //   if (pulseWidth > 100.0) {
  //     this.value = 255;
  //   } else {
  //     this.value = (pulseWidth * 255 / 100);
  //   }
  // }
  // constructor(...args$:any[]) {
  //   switch (args$.length) {
  //     case 0:
  //       return this.constructor$0(...args$);
  //     case 2:
  //       return this.constructor$2(...args$);
  //   }
  // }
  set_pin(pin:number) {
    this.pin = pin;
  }
  set_pulse(percent:number) {
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
    if(this.value != undefined){
    let percent = this.value * 100 / 255;
    return percent;
    } else
      return -1;
    
  }
}

export {Pwm}
