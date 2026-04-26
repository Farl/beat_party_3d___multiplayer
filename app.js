import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { WebsimSocket } from "websim-socket";
import { PlayerControls } from "./controls.js";
import { createPlayerModel } from "./player.js";
import { createBarriers, createTrees, createClouds, createDynamicDanceFloor } from "./worldGeneration.js";
import { AudioHandler } from "./audioHandler.js";
import { DummyManager } from './dummyManager.js';
import { AudioSettings } from './audioSettings.js';
import { ScanLineAudio } from './scanLineAudio.js';
import { InstructionsUI } from './instructionsUI.js';
import { PARTYKIT_HOST } from "./env.js";

function getPartyKitHost() {
  const params = new URLSearchParams(window.location.search);
  const queryHost = params.get("host");
  if (queryHost) {
    return queryHost;
  }

  if (PARTYKIT_HOST && !PARTYKIT_HOST.startsWith("__")) {
    return PARTYKIT_HOST;
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "localhost:1999";
  }

  return "";
}

async function main() {
  const partyKitHost = getPartyKitHost();
  if (!partyKitHost) {
    throw new Error("Missing PartyKit host. Set PARTYKIT_HOST during deploy or open with ?host=your-partykit-host.");
  }

  // Initialize WebsimSocket for multiplayer functionality
  const room = new WebsimSocket({ host: partyKitHost });
  await room.initialize();
  
  // Generate a random player name if not available
  const playerInfo = room.peers[room.clientId] || {};
  const playerName = playerInfo.username || `Player${Math.floor(Math.random() * 1000)}`;
  
  // Create instructions UI
  const instructionsUI = new InstructionsUI();
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    instructionsUI.setMobileInstructions();
  }

  // Safe initial position values
  const playerX = (Math.random() * 10) - 5;
  const playerZ = (Math.random() * 10) - 5;

  // Setup Three.js scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Black background for disco
  
  // Create barriers (disco elements), trees (speakers), and clouds (disco lights)
  createBarriers(scene);
  createTrees(scene);
  createClouds(scene);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);
  
  // Object to store other players
  const otherPlayers = {};
  const playerLabels = {};
  const chatMessages = {};
  
  // Create player model
  const playerModel = createPlayerModel(THREE, playerName);
  scene.add(playerModel);
  
  // Create AudioSettings before AudioHandler
  const audioSettings = new AudioSettings();
  
  // Create AudioHandler with AudioSettings
  const audioHandler = new AudioHandler(audioSettings);

  // Create ScanLineAudio with AudioSettings
  const scanLineAudio = new ScanLineAudio(audioSettings);

  // Create DummyManager with player model
  const dummyManager = new DummyManager(scene, room, audioHandler, playerModel);

  // Initialize player controls
  const playerControls = new PlayerControls(scene, room, {
    renderer: renderer,
    initialPosition: {
      x: playerX,
      y: 0.5,
      z: playerZ
    },
    playerModel: playerModel,
    dummyManager: dummyManager
  });
  const camera = playerControls.getCamera();
  
  // Modify lighting for disco atmosphere
  const ambientLight = new THREE.AmbientLight(0x404040, 1); // Dim ambient light
  scene.add(ambientLight);

  // Directional light (less intense)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  scene.add(dirLight);

  // Add spinning disco ball light effect
  const discoBallLight = new THREE.PointLight(0xffffff, 2, 50);
  discoBallLight.position.set(0, 10, 0);
  scene.add(discoBallLight);

  // Initialize dynamic dance floor and set audio handlers
  const dynamicDanceFloor = createDynamicDanceFloor(scene);
  dynamicDanceFloor.setAudioHandler(audioHandler);
  dynamicDanceFloor.setScanLineAudio(scanLineAudio);

  // Create DOM element for player name label
  function createPlayerLabel(playerId, username) {
    const label = document.createElement('div');
    label.className = 'player-name';
    label.textContent = username;
    document.getElementById('game-container').appendChild(label);
    return label;
  }
  
  // Create DOM element for chat message
  function createChatMessage(playerId) {
    const message = document.createElement('div');
    message.className = 'chat-message';
    message.style.display = 'none';
    document.getElementById('game-container').appendChild(message);
    return message;
  }
  
  // Create chat input container
  const chatInputContainer = document.createElement('div');
  chatInputContainer.id = 'chat-input-container';
  const chatInput = document.createElement('input');
  chatInput.id = 'chat-input';
  chatInput.type = 'text';
  chatInput.maxLength = 100;
  chatInput.placeholder = 'Type a message...';
  chatInputContainer.appendChild(chatInput);
  
  // Add close button for chat input
  const closeChat = document.createElement('div');
  closeChat.id = 'close-chat';
  closeChat.innerHTML = '✕';
  chatInputContainer.appendChild(closeChat);
  
  document.getElementById('game-container').appendChild(chatInputContainer);
  
  // Create chat button for all devices
  const chatButton = document.createElement('div');
  chatButton.id = 'chat-button';
  chatButton.innerText = 'CHAT';
  document.getElementById('game-container').appendChild(chatButton);
  
  // Chat event listeners
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && chatInputContainer.style.display !== 'block') {
      e.preventDefault();
      openChatInput();
    } else if (e.key === 'Escape' && chatInputContainer.style.display === 'block') {
      closeChatInput();
    } else if (e.key === 'Enter' && chatInputContainer.style.display === 'block') {
      sendChatMessage();
    }
  });
  
  closeChat.addEventListener('click', () => {
    closeChatInput();
  });
  
  chatButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (chatInputContainer.style.display === 'block') {
      closeChatInput();
    } else {
      openChatInput();
    }
  });
  
  function openChatInput() {
    chatInputContainer.style.display = 'block';
    chatInput.focus();
    
    // Disable player controls while chatting
    if (playerControls) {
      playerControls.enabled = false;
    }
  }
  
  function closeChatInput() {
    chatInputContainer.style.display = 'none';
    chatInput.value = '';
    
    // Re-enable player controls
    if (playerControls) {
      playerControls.enabled = true;
    }
  }
  
  function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message) {
      // Send chat message to all players
      room.updatePresence({
        chat: {
          message: message,
          timestamp: Date.now()
        }
      });
      
      // Show message for local player too
      chatMessages[room.clientId].textContent = message;
      chatMessages[room.clientId].style.display = 'block';
      
      // Hide message after 5 seconds
      setTimeout(() => {
        if (chatMessages[room.clientId]) {
          chatMessages[room.clientId].style.display = 'none';
        }
      }, 5000);
      
      // Clear and close input
      chatInput.value = '';
      closeChatInput();
    }
  }
  
  chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Prevent movement keys from triggering while typing
    if (e.key === 'Enter') {
      sendChatMessage();
    } else if (e.key === 'Escape') {
      closeChatInput();
    }
  });
  
  // Subscribe to presence updates - handle player joining/leaving and position updates
  room.subscribePresence((presence) => {
    for (const clientId in presence) {
      if (clientId === room.clientId) continue; // Skip self
      
      const playerData = presence[clientId];
      if (!playerData) continue;
      
      // Create new player if needed
      if (!otherPlayers[clientId] && playerData.x !== undefined && playerData.z !== undefined) {
        const peerInfo = room.peers[clientId] || {};
        const peerName = peerInfo.username || `Player${clientId.substring(0, 4)}`;
        
        const playerModel = createPlayerModel(THREE, peerName);
        playerModel.position.set(playerData.x, playerData.y || 0.5, playerData.z);
        if (playerData.rotation !== undefined) {
          playerModel.rotation.y = playerData.rotation;
        }
        scene.add(playerModel);
        otherPlayers[clientId] = playerModel;
        
        // Create name label
        playerLabels[clientId] = createPlayerLabel(clientId, peerName);
        
        // Create chat message element
        chatMessages[clientId] = createChatMessage(clientId);
      }
      
      // Update existing player
      else if (otherPlayers[clientId] && playerData.x !== undefined && playerData.z !== undefined) {
        otherPlayers[clientId].position.set(playerData.x, playerData.y || 0, playerData.z);
        if (playerData.rotation !== undefined) {
          otherPlayers[clientId].rotation.y = playerData.rotation;
        }
        
        // Animate legs if moving
        if (playerData.moving) {
          const leftLeg = otherPlayers[clientId].getObjectByName("leftLeg");
          const rightLeg = otherPlayers[clientId].getObjectByName("rightLeg");
          
          if (leftLeg && rightLeg) {
            const walkSpeed = 5;
            const walkAmplitude = 0.3;
            const animationPhase = performance.now() * 0.01 * walkSpeed; // Use performance.now() for consistent timing
            leftLeg.rotation.x = Math.sin(animationPhase) * walkAmplitude;
            rightLeg.rotation.x = Math.sin(animationPhase + Math.PI) * walkAmplitude;
          }
        } else {
          // Reset legs when standing still
          const leftLeg = otherPlayers[clientId].getObjectByName("leftLeg");
          const rightLeg = otherPlayers[clientId].getObjectByName("rightLeg");
          
          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
          }
        }
        
        // Update chat message if present
        if (playerData.chat && playerData.chat.message) {
          chatMessages[clientId].textContent = playerData.chat.message;
          chatMessages[clientId].style.display = 'block';
          
          // Hide message after 5 seconds
          setTimeout(() => {
            if (chatMessages[clientId]) {
              chatMessages[clientId].style.display = 'none';
            }
          }, 5000);
        }
      }
      
      // Handle dummy objects
      if (playerData.dummies) {
        // Remove existing dummies for this client
        const existingClientDummies = Object.values(otherPlayers)
          .filter(player => player.dummies)
          .flatMap(player => player.dummies);
        existingClientDummies.forEach(dummy => scene.remove(dummy));
        
        // Create new dummies
        const newDummies = playerData.dummies.map(dummyData => {
          const dummy = createPlayerModel(THREE, 'Dummy').createDummy(
            new THREE.Vector3(dummyData.x, dummyData.y, dummyData.z)
          );
          dummy.userData.ownerId = dummyData.ownerId;
          scene.add(dummy);
          return dummy;
        });
        
        // Attach dummies to the player model
        if (otherPlayers[clientId]) {
          otherPlayers[clientId].dummies = newDummies;
        }
      }
    }
    
    // Remove disconnected players
    for (const clientId in otherPlayers) {
      if (!presence[clientId]) {
        // Remove dummies associated with this player
        if (otherPlayers[clientId].dummies) {
          otherPlayers[clientId].dummies.forEach(dummy => {
            scene.remove(dummy);
          });
          delete otherPlayers[clientId].dummies;
        }

        scene.remove(otherPlayers[clientId]);
        delete otherPlayers[clientId];
        
        if (playerLabels[clientId]) {
          document.getElementById('game-container').removeChild(playerLabels[clientId]);
          delete playerLabels[clientId];
        }
        
        if (chatMessages[clientId]) {
          document.getElementById('game-container').removeChild(chatMessages[clientId]);
          delete chatMessages[clientId];
        }
      }
    }
  });

  // Create a chat message element for local player
  chatMessages[room.clientId] = createChatMessage(room.clientId);

  // Initialize EffectComposer for bloom effect
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Configure UnrealBloomPass
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), // resolution
    0.5,   // strength
    0.3,   // radius
    0.4    // threshold
  );
  composer.addPass(bloomPass);

  let lastTime = 0;
  function animate(currentTime) {
    requestAnimationFrame(animate);

    // Calculate delta time in seconds
    const deltaTime = (currentTime - lastTime) * 0.001;
    lastTime = currentTime;

    // Pass delta time to the update method
    playerControls.update(deltaTime);
    
    // Calculate scanline speed (you'll need to extract this from your dynamic floor)
    const tileSize = 1; // Assume tile size of 1 for demonstration
    const scanLineSpeed = tileSize * 8; // This should match the speed in worldGeneration.js
    
    // Apply beat animation to local player
    if (playerModel && playerModel.updateBeatAnimation) {
      playerModel.updateBeatAnimation(deltaTime, scanLineSpeed);
    }
    
    // Apply beat animation to other players
    for (const clientId in otherPlayers) {
      if (otherPlayers[clientId] && otherPlayers[clientId].updateBeatAnimation) {
        otherPlayers[clientId].updateBeatAnimation(deltaTime, scanLineSpeed);
      }
    }

    // Collect player positions for floor updates
    const playerPositions = [
      { 
        x: playerModel ? playerModel.position.x : 0, 
        y: playerModel ? playerModel.position.y : 0, 
        z: playerModel ? playerModel.position.z : 0,
        dummies: dummyManager.getDummies().map(dummy => ({
          x: dummy.position.x,
          y: dummy.position.y,
          z: dummy.position.z
        }))
      },
      // Other players - only include if position exists
      ...Object.values(otherPlayers)
        .filter(player => player && player.position)
        .map(player => ({
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          dummies: player.dummies ? player.dummies.map(dummy => ({
            x: dummy.position.x,
            y: dummy.position.y,
            z: dummy.position.z
          })) : []
        }))
    ];

    // Update dynamic floor tile heights with delta time
    // Add robust error handling
    try {
      if (dynamicDanceFloor && typeof dynamicDanceFloor.updateTileHeights === 'function') {
        dynamicDanceFloor.updateTileHeights(playerPositions, deltaTime);
      } else {
        console.warn('Dynamic dance floor update method not available');
      }
    } catch (error) {
      console.error('Error updating dance floor tiles:', error);
    }
    
    // Update name labels and chat messages for all players
    for (const clientId in otherPlayers) {
      if (playerLabels[clientId] && otherPlayers[clientId]) {
        const screenPosition = getScreenPosition(otherPlayers[clientId].position, camera, renderer);
        if (screenPosition) {
          playerLabels[clientId].style.left = `${screenPosition.x}px`;
          playerLabels[clientId].style.top = `${screenPosition.y - 20}px`;
          playerLabels[clientId].style.display = screenPosition.visible ? 'block' : 'none';
          
          // Position chat message above name label
          if (chatMessages[clientId]) {
            chatMessages[clientId].style.left = `${screenPosition.x}px`;
            chatMessages[clientId].style.top = `${screenPosition.y - 45}px`;
            // Only show if visible and has content
            if (chatMessages[clientId].textContent && screenPosition.visible) {
              chatMessages[clientId].style.display = 'block';
            }
          }
        } else {
          playerLabels[clientId].style.display = 'none';
          if (chatMessages[clientId]) {
            chatMessages[clientId].style.display = 'none';
          }
        }
      }
    }
    
    // Update local player's chat message position
    if (chatMessages[room.clientId] && playerModel) {
      const screenPosition = getScreenPosition(playerModel.position, camera, renderer);
      if (screenPosition && chatMessages[room.clientId].textContent) {
        chatMessages[room.clientId].style.left = `${screenPosition.x}px`;
        chatMessages[room.clientId].style.top = `${screenPosition.y - 45}px`;
        chatMessages[room.clientId].style.display = screenPosition.visible ? 'block' : 'none';
      } else {
        chatMessages[room.clientId].style.display = 'none';
      }
    }
    
    // Use composer.render instead of renderer.render
    composer.render();
  }

  // Helper function to convert 3D position to screen coordinates
  function getScreenPosition(position, camera, renderer) {
    const vector = new THREE.Vector3();
    const widthHalf = renderer.domElement.width / 2;
    const heightHalf = renderer.domElement.height / 2;
    
    // Get the position adjusted to account for player height
    vector.copy(position);
    vector.y += 1.5; // Position above the player's head
    
    // Project to screen space
    vector.project(camera);
    
    // Calculate whether object is in front of the camera
    const isInFront = vector.z < 1;
    
    // Convert to screen coordinates
    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf,
      visible: isInFront
    };
  }

  // Update window resize event to update composer
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  // Start animation
  animate(0);
}

main().catch((error) => {
  console.error("Failed to start Beat Party:", error);

  const container = document.getElementById('game-container');
  if (!container) {
    return;
  }

  const errorMessage = document.createElement('div');
  errorMessage.style.position = 'fixed';
  errorMessage.style.top = '24px';
  errorMessage.style.left = '24px';
  errorMessage.style.maxWidth = '420px';
  errorMessage.style.padding = '16px 20px';
  errorMessage.style.background = 'rgba(0, 0, 0, 0.85)';
  errorMessage.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  errorMessage.style.color = '#fff';
  errorMessage.style.fontFamily = 'monospace';
  errorMessage.style.zIndex = '2000';
  errorMessage.textContent = error.message;
  container.appendChild(errorMessage);
});