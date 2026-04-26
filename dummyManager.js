import * as THREE from 'three';
import { DebugLogger } from './debugLogger.js';

export class DummyManager {
  constructor(scene, room, audioHandler, playerModel, options = {}) {
    this.scene = scene;
    this.room = room;
    this.audioHandler = audioHandler; 
    this.playerModel = playerModel;
    this.maxDummies = options.maxDummies || 3;
    this.dummies = [];
    this.lastDummyRemovedTime = 0; 
    this.DUMMY_REMOVAL_COOLDOWN = 500; 
  }

  createDummy(position) {
    const now = Date.now();
    if (now - this.lastDummyRemovedTime < this.DUMMY_REMOVAL_COOLDOWN) {
      DebugLogger.logDummyPlacement(position, position, 'Dummy creation blocked - recent removal');
      return null;
    }

    if (this.dummies.length >= this.maxDummies) {
      const oldestDummy = this.dummies.shift();
      this.scene.remove(oldestDummy);
      DebugLogger.logDummyRemoval(oldestDummy.position, 'Max dummies reached');
    }

    const dummyPosition = new THREE.Vector3(
      position.x, 
      0, 
      position.z
    );

    DebugLogger.logDummyPlacement(position, dummyPosition);

    const dummy = this.playerModel.createDummy(dummyPosition);
    dummy.userData.isDummy = true;
    this.scene.add(dummy);
    this.dummies.push(dummy);

    if (this.room) {
      this.room.updatePresence({
        dummies: this.dummies.map(d => ({
          x: d.position.x,
          y: d.position.y,
          z: d.position.z,
          ownerId: this.room.clientId
        }))
      });
    }

    if (this.audioHandler) {
      this.audioHandler.playDummySound();
    }

    return dummy;
  }

  removeDummiesNearPosition(position, maxDistance = 1.5) {
    const closeDummies = this.dummies.filter(dummy => 
      dummy.position.distanceTo(position) < maxDistance
    );

    if (closeDummies.length > 0) {
      this.lastDummyRemovedTime = Date.now();
    }

    closeDummies.forEach(dummy => {
      DebugLogger.logDummyRemoval(dummy.position, 'Near player trigger');
      
      this.scene.remove(dummy);
      this.dummies = this.dummies.filter(d => d !== dummy);
    });

    if (this.room && closeDummies.length > 0) {
      this.room.updatePresence({
        dummies: this.dummies.map(d => ({
          x: d.position.x,
          y: d.position.y,
          z: d.position.z,
          ownerId: this.room.clientId
        }))
      });
    }

    if (closeDummies.length > 0 && this.audioHandler) {
      this.audioHandler.playDummyRemovalSound();
    }

    return closeDummies.length > 0;
  }

  getDummies() {
    return this.dummies;
  }
}