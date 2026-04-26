export class AudioContextManager {
  constructor() {
    this.audioContexts = [];
  }

  register(audioContext) {
    if (!this.audioContexts.includes(audioContext)) {
      this.audioContexts.push(audioContext);
    }
  }

  resumeAll() {
    this.audioContexts.forEach(context => {
      if (context.state === 'suspended') {
        context.resume().catch(error => {
          console.error('Error resuming AudioContext:', error);
        });
      }
    });
  }
}

// Create a global instance
window.audioContextManager = new AudioContextManager();

// Add a global event listener to resume audio contexts
document.addEventListener('click', () => {
  window.audioContextManager.resumeAll();
}, { once: false });