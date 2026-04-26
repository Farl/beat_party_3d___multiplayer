import { AudioContextManager } from './audioContextManager.js';

export class AudioSettings {
  constructor() {
    // Initialize master volume
    this.masterVolume = parseFloat(localStorage.getItem('masterVolume') || '1.0');
    
    // Create volume slider in DOM
    this.createVolumeSlider();

    // Register audio context from volume slider (if used)
    if (this.audioContext) {
      window.audioContextManager.register(this.audioContext);
    }
  }

  createVolumeSlider() {
    const container = document.createElement('div');
    container.id = 'volume-control-container';
    container.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background-color: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      display: flex;
      align-items: center;
      color: white;
    `;

    const label = document.createElement('label');
    label.textContent = '🔊';
    label.style.marginRight = '10px';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';  // Increased precision
    slider.value = this.masterVolume;
    slider.style.width = '100px';

    // Create volume value display
    const volumeDisplay = document.createElement('span');
    volumeDisplay.id = 'volume-value';
    volumeDisplay.textContent = `${Math.round(this.masterVolume * 100)}%`;
    volumeDisplay.style.marginLeft = '10px';
    volumeDisplay.style.minWidth = '40px';
    volumeDisplay.style.display = 'inline-block';

    slider.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      this.setMasterVolume(volume);
      
      // Update volume display
      volumeDisplay.textContent = `${Math.round(volume * 100)}%`;
    });

    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(volumeDisplay);
    
    // Add to game container or body
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
  }

  setMasterVolume(volume) {
    // Ensure volume is between 0 and 1, with special handling for near-zero values
    this.masterVolume = volume <= 0.01 ? 0 : Math.max(0, Math.min(1, volume));
    
    //console.log(`Master Volume Set: ${this.masterVolume}`);
    
    // Persist volume in local storage
    localStorage.setItem('masterVolume', this.masterVolume.toString());
    
    // Dispatch a custom event to allow other audio handlers to listen
    const event = new CustomEvent('masterVolumeChanged', { 
      detail: { volume: this.masterVolume } 
    });
    window.dispatchEvent(event);
  }

  getMasterVolume() {
    // Return exactly the stored master volume, which could be zero
    return this.masterVolume;
  }
}