class Board {
  
	port;
	reader;
	writer;
	encoder;
	decoder;
	prev_data;

    constructor() {
		this.encoder = new TextEncoder("utf-8");
		this.decoder = new TextDecoder("utf-8");
	}
	
	async init(){
		if ('serial' in navigator) {
			try {
			  this.port = (await navigator.serial.getPorts())[0];
			  await this.port.open({ baudRate: 57600}); // `baudRate` was `baudrate` in previous versions.
	  
			  this.writer = this.port.writable.getWriter();
			  this.reader = this.port.readable.getReader();
	  
			  const signals = await this.port.getSignals();
			  console.log(signals);
			} catch(err) {
			  console.error('There was an error opening the serial port:', err);
			}
		  } else {
			console.error('Web serial doesn\'t seem to be enabled in your browser. Try enabling it by visiting:')
			console.error('chrome://flags/#enable-experimental-web-platform-features');
			console.error('opera://flags/#enable-experimental-web-platform-features');
			console.error('edge://flags/#enable-experimental-web-platform-features');
		  }
	}

    async transmit(communicationType, deviceID, bData, fData) {

		//bData length is 8, fData length is 4
        let outData = new Uint8Array(2 + bData.length + 4 * fData.length);
		let segments = new Uint8Array(4);
		
		outData[0] = communicationType;
		outData[1] = deviceID;

		 this.deviceID = deviceID;
		
		 this.arraycopy(bData, 0, outData, 2, bData.length);
		
		 let j = 2 + bData.length;
		for(let i = 0; i < fData.length; i++) {
			segments = this.FloatToBytes(fData[i]);
			this.arraycopy(segments, 0, outData, j, 4);
			j = j + 4;
		}

		this.writer.write(outData);
		return;
    }

    async receive(communicationType, deviceID, expected) {

	let segments = new Uint8Array(4);
	
	let inData = new Uint8Array(1 + 4 * expected);
	let data = new Float32Array(expected);	

	try {
		const readerData = await this.reader.read();
		inData = readerData.value;

		if (inData[0] != deviceID) {
			return data;
		}
		else if (inData.length != 9) {
			return data;
		}

		let j = 1;

		for (var i = 0; i < expected; i++)
		{
			this.arraycopy(inData, j, segments, 0, 4);
			data[i] = this.BytesToFloat(segments);
			j = j + 4;
		}

		return data;

	  } catch (err) {
		const errorMessage = `error reading data: ${err}`;
		console.error(errorMessage);
	  }
}

    data_available(){
         let available = false;
        
        if(this.port.readable) {
            available = true;
        }
        
        return available;
    }

    reset_board() {
		let communicationType = 0;
		let deviceID = 0;
		let bData = new Uint8Array(0);
		let fData = new Float32Array(0);
		
		this.transmit(communicationType, deviceID, bData, fData);
	}

    set_buffer(length) {
	}

    FloatToBytes(val){

		let segments = new ArrayBuffer(4);
		let temp = this.floatToRawIntBits(val);
		segments[3] = ((temp >> 24) & 0xff);
		segments[2] = ((temp >> 16) & 0xff);
		segments[1] = ((temp >> 8) & 0xff);
		segments[0] = ((temp) & 0xff);
		return segments;
  
	}


    BytesToFloat(segment){
  
		let temp = 0;
  
		temp = (temp | (segment[3] & 0xff)) << 8;
		temp = (temp | (segment[2] & 0xff)) << 8;
		temp = (temp | (segment[1] & 0xff)) << 8;
		temp = (temp | (segment[0] & 0xff)); 
  
		let val = this.intBitsToFloat(temp);
  
		return val;
	}
	
	floatToRawIntBits(f)
	{
		var buf = new ArrayBuffer(4);
		(new Float32Array(buf))[0] = f;
		return (new Uint32Array(buf))[0];
	}

	//JS version of intBitsToFloat
	intBitsToFloat(f) {
		var int8 = new Int8Array(4);
		var int32 = new Int32Array(int8.buffer, 0, 1);
		int32[0] = f;
		var float32 = new Float32Array(int8.buffer, 0, 1);
		return float32[0];
	  }	
  
    arraycopy(src, srcPos, dst, dstPos, length) {
    while (length--) dst[dstPos++] = src[srcPos++]; return dst;
}
  serverConnected() {
  print("Connected to server");
}
    
}

export { Board }
