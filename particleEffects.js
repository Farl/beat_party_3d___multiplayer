import * as THREE from 'three';

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeSystems = new Map();
    this.particleGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    
    // Define an array of vibrant colors to choose from
    this.particleColors = [
      0xff0000, // Red
      0x00ff00, // Green 
      0x0000ff, // Blue
      0xff00ff, // Magenta
      0x00ffff, // Cyan
      0xffff00, // Yellow
      0xff8800, // Orange
      0xff0088, // Pink
      0x88ff00, // Lime
      0x0088ff  // Sky blue
    ];
  }

  createParticles(position, baseColor, count = 20) {
    const group = new THREE.Group();
    const particles = [];
    
    // Convert base color to HSL for variation
    const color = new THREE.Color(baseColor);
    const hsl = {};
    color.getHSL(hsl);
    
    for (let i = 0; i < count; i++) {
      // Choose either a random vibrant color or a variation of the base color
      const useRandomColor = Math.random() < 0.5;
      let particleColor;
      
      if (useRandomColor) {
        // Use a random predefined color
        particleColor = new THREE.Color(
          this.particleColors[Math.floor(Math.random() * this.particleColors.length)]
        );
      } else {
        // Create a variation of the base color
        particleColor = new THREE.Color().setHSL(
          (hsl.h + (Math.random() * 0.2 - 0.1)) % 1.0, // Hue variation ±0.1
          Math.min(1, hsl.s * (0.8 + Math.random() * 0.4)), // Saturation variation
          Math.min(1, hsl.l * (0.8 + Math.random() * 0.4))  // Lightness variation
        );
      }
      
      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 1
      });
      
      const particle = new THREE.Mesh(this.particleGeometry, material);
      
      particle.position.set(
        position.x + (Math.random() - 0.5) * 2.0,
        position.y + Math.random() * 1.5,
        position.z + (Math.random() - 0.5) * 2.0
      );
      
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.0,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 1.0
      );
      
      particles.push(particle);
      group.add(particle);
    }
    
    this.scene.add(group);
    this.activeSystems.set(group, {
      particles,
      age: 0,
      maxAge: 1.5
    });
    
    return group;
  }

  update(deltaTime) {
    for (const [group, system] of this.activeSystems) {
      system.age += deltaTime;
      
      if (system.age >= system.maxAge) {
        this.scene.remove(group);
        this.activeSystems.delete(group);
        continue;
      }
      
      const lifeRatio = 1 - (system.age / system.maxAge);
      
      system.particles.forEach(particle => {
        particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));
        particle.userData.velocity.y -= 2 * deltaTime;
        particle.material.opacity = lifeRatio;
        
        const scale = lifeRatio * 0.5 + 0.5;
        particle.scale.set(scale, scale, scale);
      });
    }
  }
}

export function createParticleEffects(scene) {
  return new ParticleSystem(scene);
}