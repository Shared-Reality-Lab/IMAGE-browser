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
import { Pwm } from "./Pwm";
import { Actuator } from "./Actuator";
import { Sensor } from "./Sensor";
import { Board } from "./Board";
import { Pantograph } from "./Pantograph";

class Device {

    deviceLink: Board;

    deviceID: number;
    mechanism: any;

    communicationType: number | undefined;

    actuatorsActive = 0;
    motors: Array<Actuator> = [];

    encodersActive = 0;
    encoders: Array<Sensor> = [];

    sensorsActive: number = 0;
    sensors: Array<Sensor> = [];

    pwmsActive: number = 0;
    pwms: Array<Pwm> = [];

    actuatorPositions: Array<number> = [0, 0, 0, 0];
    encoderPositions: Array<number> = [0, 0, 0, 0];

    constructor(deviceID: number, deviceLink: Board) {
        this.deviceID = deviceID;
        this.deviceLink = deviceLink;

    }

    add_actuator(actuator: number, rotation: number, port: number) {
        let error = false;

        if (port < 1 || port > 4) {
            console.log("error: encoder port index out of bounds");
            error = true;
        }

        if (actuator < 1 || actuator > 4) {
            console.log("error: encoder index out of bound!");
            error = true;
        }

        let j = 0;
        for (let i = 0; i < this.actuatorsActive; i++) {
            if (this.motors[i].get_actuator() < actuator) {
                j++;
            }

            if (this.motors[i].get_actuator() == actuator) {
                console.log("error: actuator " + actuator + " has already been set");
                error = true;
            }
        }

        if (!error) {

            let temp = [];
            for (var i = 0; i < this.actuatorsActive + 1; i++) {
                temp[i] = this.motors[i];
            }

            temp[this.actuatorsActive] = new Actuator(actuator, rotation, port);
            this.actuator_assignment(actuator, port);

            this.motors = temp;
            this.actuatorsActive++;
        }
    }

    add_encoder(encoder: number, rotation: number, offset: number, resolution: number, port: number) {
        let error = false;

        if (port < 1 || port > 4) {
            console.log("error: encoder port index out of bounds");
            error = true;
        }

        if (encoder < 1 || encoder > 4) {
            console.log("error: encoder index out of bound!");
            error = true;
        }

        // determine index for copying
        let j = 0;
        for (let i = 0; i < this.encodersActive; i++) {
            if (this.encoders[i].get_encoder() < encoder) {
                j++;
            }

            if (this.encoders[i].get_encoder() == encoder) {
                console.log("error: encoder " + encoder + " has already been set");
                error = true;
            }
        }

        if (!error) {

            let temp = [];
            for (var i = 0; i < this.encodersActive + 1; i++) {
                temp[i] = this.encoders[i];
            }

            temp[this.encodersActive] = new Sensor(encoder, rotation, offset, resolution, port);
            this.encoder_assignment(encoder, port);

            this.encoders = temp;
            this.encodersActive++;
        }
    }

    add_analog_sensor(pin: string) {
        // set sensor to be size zero
        let error = false;

        let port = pin.charAt(0);
        let number = pin.substring(1);

        let value = parseInt(number);
        value = value + 54;

        for (let i = 0; i < this.sensorsActive; i++) {
            if (value == this.sensors[i].get_port()) {
                console.log("error: Analog pin: A" + (value - 54) + " has already been set");
                error = true;
            }
        }

        if (port != 'A' || value < 54 || value > 65) {
            console.log("error: outside analog pin range");
            error = true;
        }

        if (!error) {
            let temp = this.sensors;
            temp[this.sensorsActive] = new Sensor();
            temp[this.sensorsActive].set_port(value);
            this.sensors = temp;
            this.sensorsActive++;
        }
    }

    add_pwm_pin(pin: number) {

        let error = false;

        for (let i = 0; i < this.pwmsActive; i++) {
            if (pin == this.pwms[i].get_pin()) {
                console.log("error: pwm pin: " + pin + " has already been set");
                error = true;
            }
        }

        if (pin < 0 || pin > 13) {
            console.log("error: outside pwn pin range");
            error = true;
        }

        if (pin == 0 || pin == 1) {
            console.log("warning: 0 and 1 are not pwm pins on Haply M3 or Haply original");
        }


        if (!error) {
            const temp = this.pwms;
            temp[this.pwmsActive] = new Pwm();
            temp[this.pwmsActive].set_pin(pin);
            this.pwms = temp;
            this.pwmsActive++;
        }
    }

    set_mechanism(mechanism: any) {
        console.log(mechanism);
        this.mechanism = mechanism;
    }

    device_set_parameters() {

        this.communicationType = 1;

        let control;

        let encoderParameters = new Float32Array();

        let encoderParams: Uint8Array;
        let motorParams: Uint8Array = new Uint8Array();
        let sensorParams: Uint8Array;
        let pwmParams: Uint8Array;

        if (this.encodersActive > 0) {
            encoderParams = new Uint8Array(this.encodersActive + 1);
            control = 0;

            for (let i = 0; i < this.encoders.length; i++) {
                if (this.encoders[i].get_encoder() != (i + 1)) {
                    console.log("warning, improper encoder indexing");
                    this.encoders[i].set_encoder(i + 1);
                    this.encoderPositions[this.encoders[i].get_port() - 1] = this.encoders[i].get_encoder();
                }
            }

            for (let i = 0; i < this.encoderPositions.length; i++) {
                control = control >> 1;

                if (this.encoderPositions[i] > 0) {
                    control = control | 0x0008;
                }
            }

            encoderParams[0] = control;

            encoderParameters = new Float32Array(2 * this.encodersActive);

            let j = 0;
            for (let i = 0; i < this.encoderPositions.length; i++) {
                if (this.encoderPositions[i] > 0) {
                    encoderParameters[2 * j] = this.encoders[this.encoderPositions[i] - 1].get_offset();
                    encoderParameters[2 * j + 1] = this.encoders[this.encoderPositions[i] - 1].get_resolution();
                    j++;
                    encoderParams[j] = this.encoders[this.encoderPositions[i] - 1].get_direction();
                }
            }
        }
        else {
            encoderParams = new Uint8Array(1);
            encoderParams[0] = 0;
            encoderParameters = new Float32Array(0);
        }


        if (this.actuatorsActive > 0) {
            motorParams = new Uint8Array(this.actuatorsActive + 1);
            control = 0;

            for (let i = 0; i < this.motors.length; i++) {
                if (this.motors[i].get_actuator() != (i + 1)) {
                    console.log("warning, improper actuator indexing");
                    this.motors[i].set_actuator(i + 1);
                    this.actuatorPositions[this.motors[i].get_port() - 1] = this.motors[i].get_actuator();
                }
            }

            for (let i = 0; i < this.actuatorPositions.length; i++) {
                control = control >> 1;

                if (this.actuatorPositions[i] > 0) {
                    control = control | 0x0008;
                }
            }

            motorParams[0] = control;

            let j = 1;
            for (let i = 0; i < this.actuatorPositions.length; i++) {
                if (this.actuatorPositions[i] > 0) {
                    motorParams[j] = this.motors[this.actuatorPositions[i] - 1].get_direction();
                    j++;
                }
            }
        } else {
            const motorParams = new Uint8Array(1);
            motorParams[0] = 0;
        }

        if (this.sensorsActive > 0) {
            sensorParams = new Uint8Array(this.sensorsActive + 1);
            sensorParams[0] = this.sensorsActive;

            for (let i = 0; i < this.sensorsActive; i++) {
                sensorParams[i + 1] = this.sensors[i].get_port();
            }

            sensorParams = sensorParams.sort();

            for (let i = 0; i < this.sensorsActive; i++) {
                this.sensors[i].set_port(sensorParams[i + 1]);
            }

        } else {
            sensorParams = new Uint8Array(1);
            sensorParams[0] = 0;
        }

        if (this.pwmsActive > 0) {
            let temp = new Uint8Array(this.pwmsActive);

            pwmParams = new Uint8Array(this.pwmsActive + 1);
            pwmParams[0] = this.pwmsActive;


            for (let i = 0; i < this.pwmsActive; i++) {
                temp[i] = this.pwms[i].get_pin();
            }

            temp = temp.sort();

            for (let i = 0; i < this.pwmsActive; i++) {
                this.pwms[i].set_pin(temp[i]);
                pwmParams[i + 1] = this.pwms[i].get_pin();
            }

        } else {
            pwmParams = new Uint8Array(1);//byte[1];
            pwmParams[0] = 0;
        }

        const encMtrSenPwm = new Uint8Array(motorParams.length + encoderParams.length + sensorParams.length + pwmParams.length);
        this.arraycopy(motorParams, 0, encMtrSenPwm, 0, motorParams.length);
        this.arraycopy(encoderParams, 0, encMtrSenPwm, motorParams.length, encoderParams.length);
        this.arraycopy(sensorParams, 0, encMtrSenPwm, motorParams.length + encoderParams.length, sensorParams.length);
        this.arraycopy(pwmParams, 0, encMtrSenPwm, motorParams.length + encoderParams.length + sensorParams.length, pwmParams.length);
        this.deviceLink.transmit(this.communicationType, this.deviceID, encMtrSenPwm, encoderParameters);
    }

    actuator_assignment(actuator: number, port: number) {
        if (this.actuatorPositions[port - 1] > 0) {
            console.log("warning, double check actuator port usage");
        }

        this.actuatorPositions[port - 1] = actuator;
    }


    arraycopy(src: Uint8Array, srcPos: number, dst: Uint8Array, dstPos: number, length: number) {
        while (length--) dst[dstPos++] = src[srcPos++]; return dst;
    }

    /**
     * assigns encoder positions based on actuator port
     */
    encoder_assignment(encoder: number, port: number) {
        if (this.encoderPositions[port - 1] > 0) {
            console.log("warning, double check encoder port usage");
        }

        this.encoderPositions[port - 1] = encoder;
    }

    async device_read_data() {
        let communicationType = 2;
        let dataCount = 0;

        const device_data = await this.deviceLink.receive(communicationType, this.deviceID, this.sensorsActive + this.encodersActive);

        //do not process garbled data from the serial comms
        if (device_data[0] == 0 && device_data[1] == 0)
            return;

        for (let i = 0; i < this.sensorsActive; i++) {
            this.sensors[i].set_value(device_data[dataCount]);
            dataCount++;
        }

        for (let i = 0; i < this.encoderPositions.length; i++) {
            if (this.encoderPositions[i] > 0) {
                this.encoders[this.encoderPositions[i] - 1].set_value(device_data[dataCount]);
                dataCount++;
            }
        }
    }

    device_read_request() {
        let communicationType = 2;
        const pulses = new Uint8Array(this.pwmsActive);
        const encoderRequest = new Float32Array(this.actuatorsActive);

        for (let i = 0; i < this.pwms.length; i++) {
            pulses[i] = this.pwms[i].get_value();
        }

        let j = 0;
        for (let i = 0; i < this.actuatorPositions.length; i++) {
            if (this.actuatorPositions[i] > 0) {
                encoderRequest[j] = 0;
                j++;
            }
        }

        this.deviceLink.transmit(communicationType, this.deviceID, pulses, encoderRequest);
    }

    device_write_torques() {
        let communicationType = 2;
        const pulses = new Uint8Array(this.pwmsActive);
        const deviceTorques = new Float32Array(this.actuatorsActive);

        for (let i = 0; i < this.pwms.length; i++) {
            pulses[i] = this.pwms[i].get_value();
        }

        let j = 0;
        for (let i = 0; i < this.actuatorPositions.length; i++) {
            if (this.actuatorPositions[i] > 0) {
                deviceTorques[j] = this.motors[this.actuatorPositions[i] - 1].get_torque();
                j++;
            }
        }

        this.deviceLink.transmit(communicationType, this.deviceID, pulses, deviceTorques);
    }

    set_pwm_pulse(pin: number, pulse: number) {

        for (let i = 0; i < this.pwms.length; i++) {
            if (this.pwms[i].get_pin() == pin) {
                this.pwms[i].set_pulse(pulse);
            }
        }
    }

    get_pwm_pulse(pin: number) {

        let pulse = 0;

        for (let i = 0; i < this.pwms.length; i++) {
            if (this.pwms[i].get_pin() == pin) {
                pulse = this.pwms[i].get_pulse();
            }
        }

        return pulse;
    }

    get_device_angles() {
        const angles = new Float32Array(this.encodersActive);

        for (let i = 0; i < this.encodersActive; i++) {
            angles[i] = this.encoders[i].get_value();
        }
        return angles;
    }

    get_sensor_data() {
        const data = new Float32Array(this.sensorsActive);

        let j = 0;
        for (let i = 0; i < this.sensorsActive; i++) {
            data[i] = this.sensors[i].get_value();
        }

        return data;
    }

    get_device_position(angles: Float32Array) {
        this.mechanism.forwardKinematics(angles);
        var endEffectorPosition = this.mechanism.get_coordinate();

        return endEffectorPosition;
    }

    set_device_torques(forces: Float32Array) {
        this.mechanism.torqueCalculation(forces);
        var torques = this.mechanism.get_torque();

        for (let i = 0; i < this.actuatorsActive; i++) {
            this.motors[i].set_torque(torques[i]);
        }

        return torques;
    }
}

export { Device }
