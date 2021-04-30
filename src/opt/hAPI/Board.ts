/* Port of v2.1.0 hAPI by Haply Robotics. */

class Board {
    port: SerialPort;
    deviceID: number;

    // Since we can't have asynchronous code in constructors
    // We assume the port is open and initialized to 9600 baud
    constructor(port: SerialPort) {
        this.port = port;
        this.deviceID = 0;
        this.reset_board();
    }

    public async transmit(communicationType: number, deviceID: number, bData: Uint8Array, fData: Float32Array) {
        let outData = new Uint8Array(2 + bData.length + 4 * fData.length);
        outData[0] = communicationType;
        outData[1] = deviceID;

        this.deviceID = deviceID;
        outData.set(bData, 2);
        outData.set(fData, 2 + bData.byteLength);

        const writer = this.port.writable!.getWriter();
        await writer.write(outData);
        writer.releaseLock();
    }

    private reset_board() {
        const communicationType: number = 0;
        const deviceId: number = 0;
        const bData = new Uint8Array([0]);
        const fData = new Float32Array([0]);

        this.transmit(communicationType, deviceId, bData, fData);
    }
}
