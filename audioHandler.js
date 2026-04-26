import { AudioContextManager } from './audioContextManager.js';

export class AudioHandler {
  constructor(audioSettings) {
    // Create Web Audio API context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Initialize with a suspended state
    this.audioContext.suspend();
    
    // Register this context with the global manager
    window.audioContextManager.register(this.audioContext);

    this.audioSettings = audioSettings;

    // Broader bass frequencies
    this.bassScanFrequencies = [
      55.00,   // Low A1 - very deep bass
      82.41,   // Low E2
      110.00,  // A2
      164.81,  // E3
      220.00,  // A3
      329.63   // E4 - added harmonics
    ];

    // Add event listener to handle volume changes
    window.addEventListener('masterVolumeChanged', (event) => {
      this.updateMasterVolume(event.detail.volume);
    });

    // Add a click listener to initialize audio context properly
    const initAudio = () => {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('AudioContext resumed successfully');
        });
      }
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);
  }

  updateMasterVolume(volume) {
    // This can be used to update global audio settings if needed
    // Currently, volume is handled per-sound creation
  }

  playSound(frequency, waveform = 'triangle', options = {}) {
    // Ensure AudioContext is in running state
    if (this.audioContext.state !== 'running') {
      return;
    }

    const masterVolume = this.audioSettings?.getMasterVolume() || 1.0;
    const volume = masterVolume * (options.volume || 1.0);

    // If volume is effectively zero, don't play sound at all
    if (volume <= 0.01) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Start with zero volume and ramp up more gradually
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.05); // Reduced initial peak
    gainNode.gain.linearRampToValueAtTime(volume * 0.2, this.audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);

    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(2000, this.audioContext.currentTime);

    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  playRowSound(row) {
    const masterVolume = this.audioSettings?.getMasterVolume() || 0.0;
    if (masterVolume <= 0) return;

    const noteIndex = row % 8; // assuming 8 frequencies
    const frequency = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63][noteIndex];
    const waveform = ['square', 'triangle'][Math.floor(.2 * 2)];

    // Regular tile sounds at normal volume
    this.playSound(frequency, waveform, {
      volume: 0.7 // Reduced from default 1.0
    });
  }

  playBassScanSound(row) {
    const masterVolume = this.audioSettings?.getMasterVolume() || 0.0;
    if (masterVolume <= 0.01) return;

    const frequencyIndex = row % this.bassScanFrequencies.length;
    const frequency = this.bassScanFrequencies[frequencyIndex];

    // Use different waveforms for richer bass
    const waveforms = ['sine', 'triangle', 'sawtooth'];
    const waveform = waveforms[Math.floor(Math.random() * waveforms.length)];

    // Bass volume at reduced level
    this.playSound(frequency, waveform, {
      volume: 0.2 * masterVolume  // Reduced from 0.3
    });
  }

  // Dummy sounds are silent
  playDummySound() {}
  playDummyRemovalSound() {}
}