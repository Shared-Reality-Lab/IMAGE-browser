// Create an audio context
const audioContext = new window.AudioContext();
const vibrationId = 2;

// Create an oscillator node (sine wave)
const oscillator = audioContext.createOscillator();
oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Set the frequency (440 Hz)

// Create a panner node
const panner = audioContext.createPanner();
panner.panningModel = 'equalpower';
panner.setPosition(0, 0, 0);

const gainNode = audioContext.createGain();
gainNode.gain.value = 0; // Set the initial gain

// Connect the oscillator to the panner, and the panner to the audio context's destination
oscillator.connect(gainNode);
gainNode.connect(panner);
panner.connect(audioContext.destination);

oscillator.start();

// no audio initially
audioContext.suspend();

export function setPanPosition(x: number, y: number, z: number) {
    panner.setPosition(x, y, z);
}

export function startOscillator() {
    gainNode.gain.value = 0.75;
    audioContext.resume();
}

export function stopOscillator() {
    gainNode.gain.value = 0;
    audioContext.suspend();
}

async function setDevice() {
    // await navigator.mediaDevices.getUserMedia({ audio: true });
    let devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter((device) => device.kind === "audiooutput");
    const outputVibration = audioDevices[vibrationId].deviceId;
    audioContext.setSinkId(outputVibration);
}

setDevice();