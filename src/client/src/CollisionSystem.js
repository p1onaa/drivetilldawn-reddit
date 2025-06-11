export class CollisionSystem {
  constructor(scene, camera, audioSystem) {
    this.scene = scene;
    this.camera = camera;
    this.audioSystem = audioSystem;
    
    // Collision state
    this.isCollisionActive = false;
    this.collisionStartTime = 0;
    this.collisionDuration = 2000; // 2 seconds for physics animation
    this.scoreDisplayTime = 2000; // Show score after 2 seconds (when physics ends)
    
    // Physics properties
    this.playerCar = null;
    this.otherCar = null;
    this.playerVelocity = { x: 0, y: 0, z: 0 };
    this.otherCarVelocity = { x: 0, y: 0, z: 0 };
    this.playerAngularVelocity = { x: 0, y: 0, z: 0 };
    this.otherCarAngularVelocity = { x: 0, y: 0, z: 0 };
    
    // Gravity and physics constants
    this.gravity = -0.02;
    this.friction = 0.98;
    this.angularFriction = 0.95;
    this.bounceRestitution = 0.3;
    
    // Camera shake and position
    this.cameraShake = { x: 0, y: 0, z: 0 };
    this.shakeIntensity = 0;
    this.originalCameraPosition = { x: 0, y: 0, z: 0 };
    this.cameraFrozen = false;
    this.frozenCameraPosition = { x: 0, y: 0, z: 0 };
    
    // Score display
    this.finalScore = 0;
    this.scoreDisplayed = false;
    this.animationComplete = false;
    this.soundPlayed = false;
  }
  
  startCollision(playerCar, otherCar, finalScore) {
    if (this.isCollisionActive) return;
    
    console.log('💥 COLLISION! Starting physics animation...');
    
    this.isCollisionActive = true;
    this.collisionStartTime = Date.now();
    this.playerCar = playerCar;
    this.otherCar = otherCar;
    this.finalScore = finalScore;
    this.scoreDisplayed = false;
    this.animationComplete = false;
    this.soundPlayed = false;
    this.cameraFrozen = false;
    
    // Store original camera position
    this.originalCameraPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
    
    // Play collision sound only once
    if (!this.soundPlayed) {
      this.audioSystem.playCollision();
      this.soundPlayed = true;
    }
    
    // Calculate collision physics
    this.calculateCollisionPhysics();
    
    // Start camera shake
    this.shakeIntensity = 0.5;
  }
  
  calculateCollisionPhysics() {
    // Get collision direction and impact force
    const playerPos = this.playerCar.position;
    const otherPos = this.otherCar.position;
    
    // Calculate collision vector
    const collisionVector = {
      x: playerPos.x - otherPos.x,
      y: 0,
      z: playerPos.z - otherPos.z
    };
    
    // Normalize collision vector
    const magnitude = Math.sqrt(collisionVector.x ** 2 + collisionVector.z ** 2);
    if (magnitude > 0) {
      collisionVector.x /= magnitude;
      collisionVector.z /= magnitude;
    }
    
    // Set initial velocities based on collision
    const impactForce = 0.8;
    const upwardForce = 0.4;
    
    // Player car gets launched
    this.playerVelocity = {
      x: collisionVector.x * impactForce + (Math.random() - 0.5) * 0.3,
      y: upwardForce + Math.random() * 0.2,
      z: collisionVector.z * impactForce + (Math.random() - 0.5) * 0.3
    };
    
    // Other car reacts to collision
    this.otherCarVelocity = {
      x: -collisionVector.x * impactForce * 0.6,
      y: upwardForce * 0.3,
      z: -collisionVector.z * impactForce * 0.6
    };
    
    // Add random angular velocities for spinning effect
    this.playerAngularVelocity = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.4,
      z: (Math.random() - 0.5) * 0.3
    };
    
    this.otherCarAngularVelocity = {
      x: (Math.random() - 0.5) * 0.2,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.2
    };
  }
  
  update() {
    if (!this.isCollisionActive) return false;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.collisionStartTime;
    const progress = elapsedTime / this.collisionDuration;
    
    // Physics animation phase (0-3 seconds)
    if (elapsedTime < this.scoreDisplayTime && !this.animationComplete) {
      this.updatePhysics();
      this.updateCameraShake(progress);
    }
    
    // Show score after 3 seconds
    if (elapsedTime >= this.scoreDisplayTime && !this.scoreDisplayed) {
      this.displayFinalScore();
      this.scoreDisplayed = true;
      this.animationComplete = true;
      
      // Freeze camera at current position (smooth transition)
      this.freezeCamera();
    }
    
    // Animation is complete after score is shown
    if (this.scoreDisplayed) {
      return true; // Animation finished
    }
    
    return false; // Animation still running
  }
  
  updatePhysics() {
    if (!this.playerCar || !this.otherCar || this.animationComplete) return;
    
    // Update player car physics
    this.updateCarPhysics(this.playerCar, this.playerVelocity, this.playerAngularVelocity);
    
    // Update other car physics
    this.updateCarPhysics(this.otherCar, this.otherCarVelocity, this.otherCarAngularVelocity);
  }
  
  updateCarPhysics(car, velocity, angularVelocity) {
    // Apply gravity
    velocity.y += this.gravity;
    
    // Apply friction
    velocity.x *= this.friction;
    velocity.z *= this.friction;
    
    // Apply angular friction
    angularVelocity.x *= this.angularFriction;
    angularVelocity.y *= this.angularFriction;
    angularVelocity.z *= this.angularFriction;
    
    // Update position
    car.position.x += velocity.x;
    car.position.y += velocity.y;
    car.position.z += velocity.z;
    
    // Update rotation
    car.rotation.x += angularVelocity.x;
    car.rotation.y += angularVelocity.y;
    car.rotation.z += angularVelocity.z;
    
    // Ground collision (simple bounce)
    if (car.position.y < 0) {
      car.position.y = 0;
      velocity.y = -velocity.y * this.bounceRestitution;
      
      // Reduce horizontal velocity on ground impact
      velocity.x *= 0.8;
      velocity.z *= 0.8;
      
      // Reduce angular velocity on ground impact
      angularVelocity.x *= 0.7;
      angularVelocity.y *= 0.9;
      angularVelocity.z *= 0.7;
    }
  }
  
  updateCameraShake(progress) {
    if (this.animationComplete || this.cameraFrozen) {
      this.shakeIntensity = 0;
      return;
    }
    
    // Reduce shake intensity over time
    this.shakeIntensity = Math.max(0, 0.5 * (1 - progress));
    
    // Generate random shake
    this.cameraShake.x = (Math.random() - 0.5) * this.shakeIntensity;
    this.cameraShake.y = (Math.random() - 0.5) * this.shakeIntensity;
    this.cameraShake.z = (Math.random() - 0.5) * this.shakeIntensity;
    
    // Apply shake to camera
    this.camera.position.x = this.originalCameraPosition.x + this.cameraShake.x;
    this.camera.position.y = this.originalCameraPosition.y + this.cameraShake.y;
    this.camera.position.z = this.originalCameraPosition.z + this.cameraShake.z;
  }
  
  freezeCamera() {
    // Store current camera position (including any shake) as the frozen position
    this.frozenCameraPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
    
    this.cameraFrozen = true;
    this.shakeIntensity = 0;
    
    // Set camera to frozen position (removes any remaining shake)
    this.camera.position.x = this.frozenCameraPosition.x;
    this.camera.position.y = this.frozenCameraPosition.y;
    this.camera.position.z = this.frozenCameraPosition.z;
    
    console.log('📷 Camera frozen at collision end position');
  }
  
  displayFinalScore() {
    // Create score display overlay
    const scoreOverlay = document.createElement('div');
    scoreOverlay.id = 'finalScoreDisplay';
    scoreOverlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 40px 60px;
      border-radius: 20px;
      font-family: Arial, sans-serif;
      font-size: 36px;
      font-weight: bold;
      text-align: center;
      border: 3px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
      animation: scoreAppear 0.5s ease-out;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes scoreAppear {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    
    scoreOverlay.innerHTML = `
      <div style="color: #ff4444; font-size: 28px; margin-bottom: 20px;">GAME OVER</div>
      <div style="color: #ffffff; font-size: 42px; margin-bottom: 20px;">SCORE: ${Math.floor(this.finalScore)}</div>
      <div style="color: #aaaaaa; font-size: 18px;">Press SPACE to restart</div>
    `;
    
    document.body.appendChild(scoreOverlay);
    
    console.log(`💥 Final Score: ${Math.floor(this.finalScore)}`);
  }
  
  endCollision() {
    this.isCollisionActive = false;
    this.animationComplete = true;
    this.cameraFrozen = false;
    
    console.log('💥 Collision animation completed');
  }
  
  reset() {
    // Remove score display if it exists
    const scoreDisplay = document.getElementById('finalScoreDisplay');
    if (scoreDisplay) {
      scoreDisplay.remove();
    }
    
    // Reset collision state
    this.isCollisionActive = false;
    this.scoreDisplayed = false;
    this.animationComplete = false;
    this.soundPlayed = false;
    this.cameraFrozen = false;
    this.playerCar = null;
    this.otherCar = null;
    
    // Reset velocities
    this.playerVelocity = { x: 0, y: 0, z: 0 };
    this.otherCarVelocity = { x: 0, y: 0, z: 0 };
    this.playerAngularVelocity = { x: 0, y: 0, z: 0 };
    this.otherCarAngularVelocity = { x: 0, y: 0, z: 0 };
    
    // Reset camera
    this.cameraShake = { x: 0, y: 0, z: 0 };
    this.shakeIntensity = 0;
  }
  
  isActive() {
    return this.isCollisionActive;
  }
  
  isCameraFrozen() {
    return this.cameraFrozen;
  }
}