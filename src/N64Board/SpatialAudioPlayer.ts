export class SpatialAudioPlayer {
    private audioContext: AudioContext;
    private oscillator: OscillatorNode | null;
    private panner: PannerNode;
    private gainNode: GainNode;
    private audioDeviceId?: number;
    private audioSource: MediaElementAudioSourceNode | null;

    constructor(audioDeviceId?: number) {
        this.audioContext = new window.AudioContext();
        this.audioDeviceId = audioDeviceId;
        this.oscillator = null; // Initialize oscillator as null
        this.audioSource = null; // Initialize audioSource as null

        // Create a panner node
        this.panner = this.audioContext.createPanner();
        this.panner.panningModel = 'equalpower';
        this.panner.setPosition(0, 0, 0);

        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0; // Set the initial gain
        this.gainNode.connect(this.panner);

        // Connect the panner to the audio context's destination
        this.panner.connect(this.audioContext.destination);

        // Suspend the audio context initially
        this.audioContext.suspend();

        // Set the audio output device
        this.setDevice();
    }

    private async setDevice() {
        try {
            if (this.audioDeviceId !== undefined) {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                let devices = await navigator.mediaDevices.enumerateDevices();
                const audioDevices = devices.filter((device) => device.kind === "audiooutput");
                const outputVibration = audioDevices[this.audioDeviceId]?.deviceId;
                if (outputVibration) {
                    this.audioContext.setSinkId(outputVibration);
                    console.log(outputVibration);
                }
            }
        } catch (error) {
            console.error("Error setting audio output device:", error);
        }
    }

    public setOscillator(frequency: number = 440) {
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        this.oscillator.connect(this.gainNode);
        this.oscillator.start();
    }

    public setAudioFile(link: string) {
        this.stopAudio(); // Stop any previous audio source
        const file = new Audio(link);
        this.audioSource = this.audioContext.createMediaElementSource(file);
        this.audioSource.connect(this.gainNode);
    }

    public setPanPosition(x: number, y: number, z: number) {
        this.panner.setPosition(x, y, z);
    }

    public startAudio() {

        if (this.audioSource) {
            this.audioSource.mediaElement.play();
        }

        this.gainNode.gain.value = 0.75;
        this.audioContext.resume();
    }

    public stopAudio() {

        // only disconnect if we're done
        if (this.audioSource) {
            //this.audioSource.mediaElement.pause();
            this.audioSource.mediaElement.currentTime = 0;
            //this.audioSource.disconnect();
        }
        this.gainNode.gain.value = 0;
        this.audioContext.suspend();
    }
}

// export class SpatialAudioPlayer {
//     private audioContext: AudioContext;
//     private oscillator: OscillatorNode;
//     private panner: PannerNode;
//     private gainNode: GainNode;
//     private vibrationId?: number;
//     private audioSource: any;

//     constructor(vibrationId?: number) {
//         this.audioContext = new window.AudioContext();
//         this.vibrationId = vibrationId;

//         // Create an oscillator node (sine wave)
//         this.oscillator = this.audioContext.createOscillator();
//         this.oscillator.type = 'sine';
//         this.oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);

//         // Create a panner node
//         this.panner = this.audioContext.createPanner();
//         this.panner.panningModel = 'equalpower';
//         this.panner.setPosition(0, 0, 0);

//         this.gainNode = this.audioContext.createGain();
//         this.gainNode.gain.value = 0; // Set the initial gain

//         // Connect the oscillator to the panner, and the panner to the audio context's destination
//         this.oscillator.connect(this.gainNode);
//         this.gainNode.connect(this.panner);

//         // const audioSource = this.audioContext.createMediaElementSource();
//         // audioContext.createMediaElementSource(sound);
//         //     audioSource.connect(panner);
//         //     panner.connect(audioContext.destination);

//         this.panner.connect(this.audioContext.destination);

//         // Start the oscillator
//         this.oscillator.start();

//         // Suspend the audio context initially
//         this.audioContext.suspend();

//         // Set the audio output device
//         this.setDevice();
//     }

//     private async setDevice() {
//         try {
//             if (this.vibrationId != undefined) {
//                 //await navigator.mediaDevices.getUserMedia({ audio: true });
//                 let devices = await navigator.mediaDevices.enumerateDevices();
//                 const audioDevices = devices.filter((device) => device.kind === "audiooutput");
//                 const outputVibration = audioDevices[this.vibrationId].deviceId;
//                 this.audioContext.setSinkId(outputVibration);
//             }
//         } catch (error) {
//             console.error("Error setting audio output device:", error);
//         }
//     }

//     public setAudioFile(link: string) {
//         const file = new Audio(link);
//         const audioSource = this.audioContext.createMediaElementSource(file);
//     }

//     public setPanPosition(x: number, y: number, z: number) {
//         this.panner.setPosition(x, y, z);
//     }

//     public startOscillator() {
//         this.gainNode.gain.value = 0.75;
//         this.audioContext.resume();
//     }

//     public stopOscillator() {
//         this.gainNode.gain.value = 0;
//         this.audioContext.suspend();
//     }
// }