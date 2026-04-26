export class InstructionsUI {
  constructor() {
    this.instructions = document.createElement("div");
    this.instructions.className = "instructions";
    this.instructions.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 16px;
      z-index: 2000;
      text-align: center;
      font-family: Arial, sans-serif;
      white-space: nowrap;
      pointer-events: none;
      display: block !important;
    `;
    
    // Start with desktop instructions
    this.setDesktopInstructions();
    document.body.appendChild(this.instructions);
  }

  setDesktopInstructions() {
    this.instructions.innerHTML = "Use WASD to move, SPACE to jump and place Dummy. Press / to chat.";
  }

  setMobileInstructions() {
    this.instructions.innerHTML = "Use joystick to move, Jump button to jump and place Dummy. Tap CHAT to chat.";
  }

  hide() {
    this.instructions.style.display = 'none';
  }

  show() {
    this.instructions.style.display = 'block';
  }
}