export class ScanLineAudio {
  constructor(audioSettings) {
    this.audioSettings = audioSettings;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Broader range of bass frequencies
    this.bassScanFrequencies = [
      55.00,   // Low A1 - very deep bass
      82.41,   // Low E2
      110.00,  // A2
      164.81,  // E3
      220.00,  // A3
      329.63   // E4 - added harmonics
    ];
  }

  playBassScanSound(row) {
    const masterVolume = this.audioSettings?.getMasterVolume() || 0.01;
    if (masterVolume <= 0.01) return;

    const frequencyIndex = row % this.bassScanFrequencies.length;
    const frequency = this.bassScanFrequencies[frequencyIndex];

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();

    // Use different waveforms for richer bass
    const waveforms = ['sine', 'triangle', 'sawtooth'];
    oscillator.type = waveforms[Math.floor(Math.random() * waveforms.length)];
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Volume now directly tied to master volume
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      masterVolume * 0.5,  
      this.audioContext.currentTime + 0.05
    );
    gainNode.gain.linearRampToValueAtTime(
      masterVolume * 0.2,  
      this.audioContext.currentTime + 0.1
    );
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);

    // Broader, more resonant filter
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(800, this.audioContext.currentTime);  // Increased filter frequency
    filterNode.Q.setValueAtTime(10, this.audioContext.currentTime);  // Add resonance

    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }
}