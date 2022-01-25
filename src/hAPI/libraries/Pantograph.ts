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

class Pantograph {
    l: number;
    L: number;
    d: number;
    th1: number;
    th2: number;
    tau1: number;
    tau2: number;
    f_x: number;
    f_y: number;
    x_E: number;
    y_E: number;
    pi: number;
    JT11: number;
    JT12: number;
    JT21: number;
    JT22: number;
    gain: number;

    constructor() {
        this.l = 0.07;
        this.L = 0.09;
        this.d = 0.00;

        this.th1 = 0;
        this.th2 = 0;
        this.tau1 = 0;
        this.tau2 = 0;
        this.f_x = 0;
        this.f_y = 0;
        this.x_E = 0;
        this.y_E = 0;

        this.pi = 3.14159265359;
        this.JT11 = 0;
        this.JT12 = 0;
        this.JT21 = 0;
        this.JT22 = 0;
        this.gain = 1.0;
    }

    torqueCalculation(force: Float32Array) {
        this.f_x = force[0];
        this.f_y = force[1];

        this.tau1 = this.JT11 * this.f_x + this.JT12 * this.f_y;
        this.tau2 = this.JT21 * this.f_x + this.JT22 * this.f_y;

        this.tau1 = this.tau1 * this.gain;
        this.tau2 = this.tau2 * this.gain;
    }

    forwardKinematics(angles: Float32Array) {

        let l1 = this.l;
        let l2 = this.l;
        let L1 = this.L;
        let L2 = this.L;

        this.th1 = (this.pi / 180) * angles[0];
        this.th2 = (this.pi / 180) * angles[1];

        // Forward Kinematics
        let c1 = Math.cos(this.th1);
        let c2 = Math.cos(this.th2);
        let s1 = Math.sin(this.th1);
        let s2 = Math.sin(this.th2);

        let xA = l1 * c1;
        let yA = l1 * s1;
        let xB = this.d + l2 * c2;

        let yB = l2 * s2;
        let hx = xB - xA;
        let hy = yB - yA;

        let hh2 = Math.pow(hx, 2) + Math.pow(hy, 2);
        let hh = (hx * hx) + (hy * hy);

        let hm = (Math.sqrt(hh));

        let cB;
        let h1x;
        let h1y;

        if (hm == 0) {
            cB = 0;
            h1x = 0;
            h1y = 0;
        } else {
            cB = -1 * (((Math.pow(L2, 2) - (Math.pow(L1, 2)) - hh)) / (2 * L1 * hm));
            h1x = L1 * cB * hx / hm;
            h1y = L1 * cB * hy / hm;
        }


        let h1h1 = Math.pow(h1x, 2) + Math.pow(h1y, 2);
        let h1m = Math.sqrt(h1h1);
        let sB = Math.sqrt(1 - Math.pow(cB, 2));

        let lx;
        let ly;

        if (h1m == 0) {
            lx = 0;
            ly = 0;
        } else {
            lx = -L1 * sB * h1y / h1m;
            ly = L1 * sB * h1x / h1m;
        }

        let x_P = xA + h1x + lx;
        let y_P = yA + h1y + ly;

        let phi1 = Math.acos((x_P - l1 * c1) / L1);
        let phi2 = Math.acos((x_P - this.d - l2 * c2) / L2);

        let c11 = Math.cos(phi1);
        let s11 = Math.sin(phi1);
        let c22 = Math.cos(phi2);
        let s22 = Math.sin(phi2);

        let dn = L1 * (c11 * s22 - c22 * s11);

        let eta;
        let nu;

        if (dn == 0) {
            eta = 0;
            nu = 0;
        } else {
            eta = (-L1 * c11 * s22 + L1 * c22 * s11 - c1 * l1 * s22 + c22 * l1 * s1) / dn;
            nu = l2 * (c2 * s22 - c22 * s2) / dn;
        }

        this.JT11 = -L1 * eta * s11 - L1 * s11 - l1 * s1;
        this.JT12 = L1 * c11 * eta + L1 * c11 + c1 * l1;
        this.JT21 = -L1 * s11 * nu;
        this.JT22 = L1 * c11 * nu;

        this.x_E = x_P;
        this.y_E = y_P;

    }

    set_mechanism_parameters(parameters: Float32Array) {
        this.l = parameters[0];
        this.L = parameters[1];
        this.d = parameters[2];
    }


    set_sensor_data(data: Float32Array) {
    }

    get_coordinate() {
        let temp = [this.x_E, this.y_E];
        return temp;
    }


    get_torque() {
        let temp = [this.tau1, this.tau2];
        return temp;
    }

    get_angle() {
        let temp = [this.th1, this.th2];
        return temp;
    }
}

export { Pantograph }
