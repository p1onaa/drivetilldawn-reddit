import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GameScene } from './GameScene.js';
import { InputHandler } from './InputHandler.js';
import { AudioSystem } from './AudioSystem.js';
import { CollisionSystem } from './CollisionSystem.js';

class NightDrivingGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.gameScene = null;
    this.inputHandler = null;
    this.audioSystem = null;
    this.collisionSystem = null;
    this.isLoaded = false;
    
    // Camera tilt for immersion
    this.cameraTilt = 0;
    this.targetCameraTilt = 0;
    
    // Score system
    this.score = 0;
    this.scoreElement = null;
    this.speedElement = null;
    
    // Game state tracking
    this.wasGameOver = false;
    this.collisionProcessed = false;
    
    this.init();
  }
  
  async init() {
    this.setupRenderer();
    this.setupCamera();
    this.setupScene();
    
    this.gameScene = new GameScene(this.scene);
    this.inputHandler = new InputHandler();
    this.audioSystem = new AudioSystem();
    this.collisionSystem = new CollisionSystem(this.scene, this.camera, this.audioSystem);
    
    await this.gameScene.init();
    
    this.hideLoading();
    this.showScore();
    this.showControls(); // Show controls after loading
    this.isLoaded = true;
    
    // Start engine sound when game is ready
    this.audioSystem.startEngine();
    
    this.animate();
  }
  
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1); // Pure black background
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameContainer').appendChild(this.renderer.domElement);
  }
  
  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Closer camera position - lower and closer to the car
    this.camera.position.set(0, 4, 8);
    this.camera.lookAt(0, 0, 0);
  }
  
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 30, 150); // Black fog to match the sky
  }
  
  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  }
  
  showScore() {
    this.scoreElement = document.getElementById('score');
    this.speedElement = document.getElementById('speedIndicator');
    this.scoreElement.style.display = 'block';
    this.speedElement.style.display = 'block';
    this.updateScore();
  }
  
  showControls() {
    // Show the arrow control buttons after loading is complete
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');
    
    if (leftArrow) {
      leftArrow.classList.add('visible');
    }
    
    if (rightArrow) {
      rightArrow.classList.add('visible');
    }
  }
  
  updateScore() {
    if (this.scoreElement) {
      this.scoreElement.textContent = `${Math.floor(this.score)}`;
    }
    
    if (this.speedElement) {
      const speedMultiplier = this.gameScene ? this.gameScene.getSpeedMultiplier() : 1;
      const kmh = Math.floor(speedMultiplier * 30); // Convert to approximate km/h
      this.speedElement.textContent = `${kmh} km/h`;
    }
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.isLoaded) {
      this.update();
      this.render();
    }
  }
  
  update() {
    const input = this.inputHandler.getInput();
    
    // Handle collision system first
    if (this.collisionSystem.isActive()) {
      const animationComplete = this.collisionSystem.update();
      
      if (animationComplete) {
        // Collision animation finished, allow restart
        if (input.restart) {
          this.restartGame();
        }
      }
      
      // Don't update other systems during collision animation
      return;
    }
    
    // Check for new collision (only if not already processed)
    if (this.gameScene.hasCollision() && !this.collisionProcessed) {
      const collisionData = this.gameScene.getCollisionData();
      if (collisionData.detected) {
        // Start collision animation
        this.collisionSystem.startCollision(
          collisionData.playerCar,
          collisionData.otherCar,
          this.score
        );
        
        // Mark collision as processed and stop engine
        this.gameScene.processCollision();
        this.audioSystem.stopEngine();
        this.collisionProcessed = true;
        
        return; // Don't continue with normal update
      }
    }
    
    // Track previous lane changing state to detect when lane change starts
    const wasChangingLanes = this.gameScene.isChangingLanes;
    
    this.gameScene.update(input);
    
    // Play lane change sound when lane change starts
    if (!wasChangingLanes && this.gameScene.isChangingLanes) {
      this.audioSystem.playLaneChange();
    }
    
    // Update score - increase by distance traveled with speed multiplier
    if (!this.gameScene.isGameOver() && !this.collisionProcessed) {
      const speedMultiplier = this.gameScene.getSpeedMultiplier();
      // Base score increase of 0.1 meters per frame, multiplied by current speed
      this.score += 0.1 * speedMultiplier;
      this.updateScore();
      
      // Update engine sound based on speed (optional)
      this.audioSystem.updateEngineSpeed(speedMultiplier);
    }
    
    // Handle game over state changes (for non-collision game overs, if any)
    const isGameOver = this.gameScene.isGameOver();
    
    if (isGameOver && !this.wasGameOver && !this.gameScene.hasCollision()) {
      // Game just ended without collision - stop engine
      this.audioSystem.stopEngine();
      this.wasGameOver = true;
    } else if (!isGameOver && this.wasGameOver) {
      // Game just restarted - start engine
      this.audioSystem.startEngine();
      this.wasGameOver = false;
    }
    
    // Update camera to follow car with enhanced movement and tilt
    // Only update camera if collision system isn't active or camera isn't frozen
    if (this.gameScene.car && !this.collisionSystem.isActive()) {
      const carPosition = this.gameScene.car.position;
      
      // Get car tilt for camera immersion
      const carTilt = this.gameScene.getCarTilt();
      this.targetCameraTilt = carTilt * 0.3; // Reduce the effect for camera
      
      // Smooth camera tilt
      this.cameraTilt = THREE.MathUtils.lerp(this.cameraTilt, this.targetCameraTilt, 0.1);
      
      // Update camera position with smooth following
      const targetCameraX = carPosition.x;
      const currentCameraX = this.camera.position.x;
      
      // Smooth camera X movement
      this.camera.position.x = THREE.MathUtils.lerp(currentCameraX, targetCameraX, 0.08);
      this.camera.position.z = carPosition.z + 8;
      this.camera.position.y = 4;
      
      // Apply camera tilt for immersion
      this.camera.rotation.z = this.cameraTilt;
      
      // Look at point slightly ahead of the car
      const lookAtX = carPosition.x;
      const lookAtY = carPosition.y;
      const lookAtZ = carPosition.z - 3;
      
      this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
      
      // Reapply the tilt after lookAt (which resets rotation)
      this.camera.rotation.z = this.cameraTilt;
    }
  }
  
  restartGame() {
    this.gameScene.reset();
    this.collisionSystem.reset();
    this.score = 0; // Reset score on restart
    this.updateScore();
    this.wasGameOver = false;
    this.collisionProcessed = false; // Reset collision processing flag
    
    // Start engine sound again
    this.audioSystem.startEngine();
    
    console.log('🔄 Game restarted! Drive safely!');
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (window.game && window.game.camera && window.game.renderer) {
    window.game.camera.aspect = window.innerWidth / window.innerHeight;
    window.game.camera.updateProjectionMatrix();
    window.game.renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// Cleanup audio on page unload
window.addEventListener('beforeunload', () => {
  if (window.game && window.game.audioSystem) {
    window.game.audioSystem.dispose();
  }
});

// Start the game
window.game = new NightDrivingGame();