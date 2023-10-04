/*
 * Copyright (c) 2023
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
 */

class N64Board {

    port: any;
    reader: any;
    writer: any;

    constructor() {
    }
    async init() {
        if ('serial' in navigator as any) {
            try {
                this.port = (await navigator.serial.getPorts())[0];
                await this.port.open({ baudRate: 230400 }); // `baudRate` was `baudrate` in previous versions.

                this.writer = this.port.writable.getWriter();
                this.reader = this.port.readable.getReader();

                const signals = await this.port.getSignals();
                console.log(signals);
            } catch (err) {
                console.error('There was an error opening the serial port:', err);
            }
        } else {
            console.error('Web serial doesn\'t seem to be enabled in your browser. Try enabling it by visiting:')
            console.error('chrome://flags/#enable-experimental-web-platform-features');
            console.error('opera://flags/#enable-experimental-web-platform-features');
            console.error('edge://flags/#enable-experimental-web-platform-features');
        }
    }

    async receive() {
        const numberOfBytes = 3;
        let bytes: Int8Array = new Int8Array(numberOfBytes);
        let startIndex: number = 0;

        const readerData = await this.reader.read();
        let chunk: Int8Array = readerData.value;

        for (let i = 0; i < chunk.length; i++) {
            if (chunk[i] == 255) {
                startIndex = i + 1;
                break;
            }
        }

        if (startIndex != -1) {
            bytes[0] = chunk[startIndex];
            bytes[1] = chunk[startIndex + 1];
            bytes[2] = chunk[startIndex + 2];
        }

        return bytes;
    }
}

export { N64Board }
