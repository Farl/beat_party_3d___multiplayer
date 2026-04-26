import * as THREE from "three";
import { createParticleEffects } from './particleEffects.js';

export function createDynamicDanceFloor(scene) {
  const gridSize = 16;
  const tileSize = 3; // Each tile is 3 units wide
  const tileHeight = 0.000001; // flat
  const tileBorder = 0.3;
  const maxTileHeight = 0.1; // Adjusted max height proportionally
  const growthRate = 0.02; // Slightly reduced growth rate
  const cooldownRate = 0.01; // Slightly reduced cooldown rate

  const particleSystem = createParticleEffects(scene);

  const floorGroup = new THREE.Group();
  floorGroup.userData.isDynamicFloor = true;

  const tiles = [];

  // Create the grid of tiles with visible borders
  for (let x = 0; x < gridSize; x++) {
    tiles[x] = [];
    for (let z = 0; z < gridSize; z++) {
      
      // Create tile geometry
      const tileGeometry = new THREE.BoxGeometry(tileSize-tileBorder, tileHeight, tileSize-tileBorder);
      
      // Create materials - one for tile surface, one for grid lines
      const tileMaterial = new THREE.MeshStandardMaterial({ 
        color: z % 2 == 0? 0xAA77AA: 0x33AAAA, // Dark grey base color
        roughness: .8,
        metalness: .3,
        emissive: z % 2 == 0? 0xAA77AA: 0x33AAAA,
        emissiveIntensity: .9
      });
      
      const gridLineMaterial = new THREE.LineBasicMaterial({ 
        color: 0, // Light grey grid lines
        linewidth: 1
      });

      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      
      // Position tiles to create a centered grid
      // Lower the ground by 0.01 units
      tile.position.set(
        (x - gridSize/2 + 0.5) * tileSize, 
        -0.2, // Lowered slightly
        (z - gridSize/2 + 0.5) * tileSize
      );
      /*
      // Create grid lines
      const gridLineGeometry = new THREE.EdgesGeometry(tileGeometry);
      const gridLines = new THREE.LineSegments(gridLineGeometry, gridLineMaterial);
      tile.add(gridLines);
      */
      
      // Custom properties for dynamic growth
      tile.userData = {
        baseColor: tile.material.color.clone(),
        currentHeight: tileHeight,
        targetHeight: tileHeight,
        x: x,
        z: z,
        triggered: false,
        soundPlayed: false // Add a flag to track sound
      };

      floorGroup.add(tile);
      tiles[x][z] = tile;
    }
  }

  // Add the floor group to the scene
  scene.add(floorGroup);

  // Scan line properties
  let scanLinePosition = -(gridSize/2) * tileSize;
  let scanLineSpeed = tileSize * 8; // Increased speed from 2 to 8 (4 times faster)
  let scanLineAudio = null;
  let audioHandler = null;
  let lastScanColumn = -1;

  // Function to update tile heights and handle scan line
  function updateTileHeights(players = [], deltaTime = 0) {
    // Collect all entities (players and their dummies)
    const allEntities = players.flatMap(player => {
      const playerEntities = [
        { 
          x: player.x, 
          y: player.y, 
          z: player.z, 
          isDummy: false 
        }
      ];
      
      // Add dummy entities if they exist
      if (player.dummies) {
        playerEntities.push(
          ...player.dummies.map(dummy => ({
            x: dummy.x, 
            y: dummy.y, 
            z: dummy.z, 
            isDummy: true
          }))
        );
      }
      
      return playerEntities;
    });

    // Update scan line position vertically (z-axis)
    scanLinePosition += scanLineSpeed * deltaTime;
    
    // Reset scan line if it goes beyond the grid
    if (scanLinePosition > (gridSize/2) * tileSize) {
      scanLinePosition = -(gridSize/2) * tileSize;
    }

    const currentColumn = Math.floor((scanLinePosition + (gridSize/2) * tileSize) / tileSize);
    
    // Reset previous column's color and sound flags if it changed
    if (lastScanColumn !== -1 && lastScanColumn !== currentColumn) {
      for (let z = 0; z < gridSize; z++) {
        tiles[lastScanColumn][z].material.color.copy(tiles[lastScanColumn][z].userData.baseColor);
        tiles[lastScanColumn][z].userData.soundPlayed = false;
      }
    }

    // Color the current column
    for (let z = 0; z < gridSize; z++) {
      const tile = tiles[currentColumn][z];
      
      // Set column color to a bright white when scanning
      tile.material.color.setHSL(0.7, 0.5, 0.8);
      
      // Determine if tile is triggered by any entity
      const isTileTriggered = allEntities.some(entity => {
        const entityTileX = Math.floor((entity.x + gridSize/2 * tileSize) / tileSize);
        const entityTileZ = Math.floor((entity.z + gridSize/2 * tileSize) / tileSize);
        return entityTileX === currentColumn && entityTileZ === z;
      });

      // Play sound and trigger tile
      if (audioHandler && !tile.userData.soundPlayed && isTileTriggered) {
        audioHandler.playRowSound(z);
        tile.userData.soundPlayed = true;
        tile.userData.triggered = true;
        
        // Add particle effect when tile is triggered
        particleSystem.createParticles(
          new THREE.Vector3(
            tile.position.x,
            tile.position.y + 0.1, // Slightly above tile
            tile.position.z
          ),
          tile.material.color
        );
      }
      
      // Reset trigger when scan line moves past
      if (tile.userData.triggered && z !== currentColumn) {
        tile.userData.triggered = false;
      }
    }

    // Update last scanned column
    lastScanColumn = currentColumn;

    // Scan every two columns for bass sound
    if (lastScanColumn !== -1 && currentColumn % 2 === 0) {
      if (audioHandler) {
        audioHandler.playBassScanSound(currentColumn);
      }
    }

    // Tile height update logic - mostly unchanged
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const tile = tiles[x][z];
        const isCurrentColumn = x === currentColumn;
        
        // Check if tile is occupied by any entity
        const isPlayerOccupied = allEntities.some(entity => {
          const entityTileX = Math.floor((entity.x + gridSize/2 * tileSize) / tileSize);
          const entityTileZ = Math.floor((entity.z + gridSize/2 * tileSize) / tileSize);
          return entityTileX === x && entityTileZ === z;
        });

        // Rest of the height and color update remains the same...
        if (isPlayerOccupied) {
          tile.userData.targetHeight = Math.min(tile.userData.targetHeight + growthRate, maxTileHeight);
          
          const heightFactor = tile.userData.targetHeight / maxTileHeight;
          tile.material.color.setHSL(
            isCurrentColumn ? 0.3 : 0.5, 
            1,  
            isCurrentColumn ? 1 : (0.5 + heightFactor * 0.5)
          );
        } else {
          tile.userData.targetHeight = Math.max(tile.userData.targetHeight - cooldownRate, tileHeight);
          
          if (!isCurrentColumn) {
            tile.material.color.lerp(tile.userData.baseColor, 0.2);
          } else {
            tile.material.color.setHSL(0.7, 0.5, 1);
          }
        }

        // Height interpolation and geometry update
        tile.userData.currentHeight += 
          (tile.userData.targetHeight - tile.userData.currentHeight) * 0.1;

        tile.geometry.dispose();
        tile.geometry = new THREE.BoxGeometry(
          tileSize-tileBorder, 
          tile.userData.currentHeight, 
          tileSize-tileBorder
        );
        tile.geometry.translate(0, tile.userData.currentHeight/2, 0);
      }
    }
    
    if (deltaTime) {
      particleSystem.update(deltaTime);
    }
  }

  // Method to set audio handlers
  function setAudioHandler(handler) {
    audioHandler = handler;
  }

  function setScanLineAudio(audio) {
    scanLineAudio = audio;
  }

  // Explicitly return the update method and new setters
  return {
    ...floorGroup,
    updateTileHeights: updateTileHeights,
    setAudioHandler: setAudioHandler,
    setScanLineAudio: setScanLineAudio
  };
}

export function createBarriers(scene) {
  // Disco ball - make it more emissive
  const discoBallGeometry = new THREE.SphereGeometry(2, 20, 20);
  const discoBallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    metalness: 1, 
    roughness: 0,
    emissive: 0xffffff,  // Add emissive color
    emissiveIntensity: 0.5  // Increase emissive intensity
  });
  const discoBall = new THREE.Mesh(discoBallGeometry, discoBallMaterial);
  discoBall.position.set(0, 10, 0);
  scene.add(discoBall);

  // Colorful barrier pillars
  const pillarColors = [
    0xff9999, // Red
    0x99ff99, // Green
    0x9999ff, // Blue
    0xffff99, // Yellow
    0xff99ff, // Magenta
    0x99ffff  // Cyan
  ];

  for (let i = 0; i < 20; i++) {
    const pillarHeight = 4 + Math.random() * 6;
    const pillarGeo = new THREE.BoxGeometry(0.5, pillarHeight, 0.5);
    const pillarMaterial = new THREE.MeshStandardMaterial({ 
      color: pillarColors[Math.floor(Math.random() * pillarColors.length)],
      metalness: 0.5,
      roughness: 0.3,
      emissive: pillarColors[Math.floor(Math.random() * pillarColors.length)],
      emissiveIntensity: 0.2  // Add subtle emissive effect
    });
    
    const pillar = new THREE.Mesh(pillarGeo, pillarMaterial);
    
    // Scatter pillars much further around the dance floor
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 40; // Increased distance
    pillar.position.set(
      Math.cos(angle) * distance, 
      pillarHeight / 2, 
      Math.sin(angle) * distance
    );
    
    pillar.castShadow = false;
    pillar.receiveShadow = false;
    scene.add(pillar);
  }
}

export function createTrees(scene) {
  // Replace trees with dance speakers - moved further out
  const speakerColors = [0x333333, 0x222222, 0x444444];
  
  for (let i = 0; i < 10; i++) {
    const speakerGroup = new THREE.Group();
    
    // Main speaker body
    const speakerMaterial = new THREE.MeshStandardMaterial({ 
      color: speakerColors[Math.floor(Math.random() * speakerColors.length)],
      roughness: 0.7,
      metalness: 1
    });
    
    const mainBoxGeo = new THREE.BoxGeometry(2, 3, 1);
    const mainSpeaker = new THREE.Mesh(mainBoxGeo, speakerMaterial);
    mainSpeaker.position.y = 1.5;
    speakerGroup.add(mainSpeaker);
    
    // Tweeter (smaller speaker on top)
    const tweeterGeo = new THREE.BoxGeometry(1, 1, 0.5);
    const tweeterSpeaker = new THREE.Mesh(tweeterGeo, speakerMaterial);
    tweeterSpeaker.position.y = 3;
    speakerGroup.add(tweeterSpeaker);
    
    // Random position much further away from the dance floor
    const angle = Math.random() * Math.PI * 2;
    const distance = 35 + Math.random() * 45; // Increased distance
    speakerGroup.position.x = Math.cos(angle) * distance;
    speakerGroup.position.z = Math.sin(angle) * distance;
    
    // Slight random rotation
    speakerGroup.rotation.y = Math.random() * Math.PI * 2;
    
    scene.add(speakerGroup);
  }
}

export function createClouds(scene) {
  const lightColors = [
    0xffaaaa, // Red
    0xaaffaa, // Green
    0xaaaaff, // Blue
    0xffffaa, // Yellow
    0xffaaff, // Magenta
    0xaaffff  // Cyan
  ];
  
  for (let i = 0; i < 30; i++) {
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: lightColors[Math.floor(Math.random() * lightColors.length)],
      emissive: lightColors[Math.floor(Math.random() * lightColors.length)],
      emissiveIntensity: .5,  // Increased emissive intensity
      transparent: true,
      opacity: 0.3
    });
    
    const lightSize = 3 + Math.random() * 1.5;
    const lightGeometry = new THREE.SphereGeometry(lightSize, 8, 8);
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    
    // Positioning lights much further around and above the dance floor
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 50; // Increased distance
    light.position.x = Math.cos(angle) * distance;
    light.position.z = Math.sin(angle) * distance;
    light.position.y = 10 + Math.random() * 10;
    
    scene.add(light);
  }
}