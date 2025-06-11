import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoadSystem } from './RoadSystem.js';
import { SkySystem } from './SkySystem.js';
import { TrafficSystem } from './TrafficSystem.js';

export class GameScene {
  constructor(scene) {
    this.scene = scene;
    this.car = null;
    this.roadSystem = null;
    this.skySystem = null;
    this.trafficSystem = null;
    this.loader = new GLTFLoader();
    
    // Lane positions (4 lanes total)
    this.lanes = [-4.5, -1.5, 1.5, 4.5];
    this.currentLane = 2; // Start in right forward lane
    this.targetLaneX = this.lanes[this.currentLane];
    
    // Enhanced lane changing system
    this.isChangingLanes = false;
    this.laneChangeProgress = 0;
    this.laneChangeDuration = 0.4; // 0.4 seconds for lane change
    this.laneChangeStartX = 0;
    this.laneChangeTargetX = 0;
    
    // Car rotation and tilt
    this.carRotationY = 0; // Steering rotation
    this.carTiltZ = 0; // Banking/leaning into turns
    this.targetRotationY = 0;
    this.targetTiltZ = 0;
    this.maxSteerAngle = -0.4; // Maximum steering angle in radians
    this.maxTiltAngle = 0.1; // Maximum banking angle in radians
    
    // Collision detection
    this.playerBoundingBox = new THREE.Box3();
    this.gameOver = false;
    this.collisionDetected = false;
    this.collidedCar = null;
    
    // Progressive speed system
    this.baseSpeed = 1.8; // Base speed multiplier
    this.currentSpeedMultiplier = 1.2; // Current speed multiplier
    this.maxSpeedMultiplier = 30.0; // Maximum speed multiplier (30x faster)
    this.speedIncreaseRate = 0.01; // How fast the speed increases (very gradual)
    this.gameTime = 0; // Track game time for speed progression
  }
  
  async init() {
    this.setupLighting();
    this.skySystem = new SkySystem(this.scene);
    this.roadSystem = new RoadSystem(this.scene);
    this.trafficSystem = new TrafficSystem(this.scene);
    
    // Create fallback car first, then try to load the model
    this.createFallbackCar();
    this.loadCar(); // Don't await this, let it replace the fallback when ready
    
    this.skySystem.init();
    this.roadSystem.init();
    await this.trafficSystem.init();
  }
  
  setupLighting() {
    // Enhanced ambient light for better car visibility
    const ambientLight = new THREE.AmbientLight(0x404080, 2.7); // Increased intensity
    this.scene.add(ambientLight);
    
    // Directional light (moonlight) - enhanced
    const directionalLight = new THREE.DirectionalLight(0x8080ff, 0.8); // Increased intensity
    directionalLight.position.set(-10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);
  }
  
  async loadCar() {
    try {
      const gltf = await this.loader.loadAsync('./models/boltcar.glb');
      const loadedCar = gltf.scene;
      
      // Remove the fallback car
      if (this.car) {
        this.scene.remove(this.car);
      }
      
      // Set up the loaded car
      this.car = loadedCar;
      this.car.scale.setScalar(0.024);
      this.car.position.set(this.targetLaneX, 0, 0);
      this.car.rotation.y = 0;
      
      // Enable shadows and add bloom effect for player car
      this.car.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Add bloom effect instead of glow for player car
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                mat.metalness = 0.4;
                mat.roughness = 0.6;
                mat.emissive = new THREE.Color(0x112211); // Green tint for player
                mat.emissiveIntensity = 0.15; // Slightly higher for player visibility
              });
            } else {
              child.material.metalness = 0.4;
              child.material.roughness = 0.6;
              child.material.emissive = new THREE.Color(0x112211);
              child.material.emissiveIntensity = 0.15;
            }
          }
        }
      });
      
      this.scene.add(this.car);
      console.log('Car model loaded successfully');
    } catch (error) {
      console.error('Error loading car model:', error);
      console.log('Using fallback car');
    }
  }
  
  createFallbackCar() {
    const geometry = new THREE.BoxGeometry(2, 1, 4);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0xff4444,
      emissive: new THREE.Color(0x112211), // Green tint for player
      emissiveIntensity: 0.15
    });
    this.car = new THREE.Mesh(geometry, material);
    this.car.position.set(this.targetLaneX, 0.5, 0);
    this.car.castShadow = true;
    this.car.receiveShadow = true;
    this.scene.add(this.car);
    console.log('Fallback car created');
  }
  
  update(input) {
    // Don't update game logic if collision is detected but not yet processed
    if (this.collisionDetected) return;
    
    if (this.gameOver) return;
    
    // Update game time and progressive speed
    this.gameTime += 1/60; // Assuming 60 FPS
    this.updateProgressiveSpeed();
    
    this.handleInput(input);
    this.updateCarMovement();
    this.updateCarRotation();
    this.updateCollision();
    
    // Pass speed multiplier to systems
    this.roadSystem.update(this.currentSpeedMultiplier);
    this.skySystem.update();
    this.trafficSystem.update(this.currentSpeedMultiplier);
  }
  
  updateProgressiveSpeed() {
    // Gradually increase speed over time
    const targetSpeed = Math.min(
      this.baseSpeed + (this.gameTime * this.speedIncreaseRate),
      this.maxSpeedMultiplier
    );
    
    // Smooth interpolation to the target speed
    this.currentSpeedMultiplier = THREE.MathUtils.lerp(
      this.currentSpeedMultiplier,
      targetSpeed,
      0.02 // Very smooth transition
    );
  }
  
  handleInput(input) {
    // Only allow lane changes if not currently changing lanes
    if (!this.isChangingLanes) {
      if (input.left && this.currentLane > 0) {
        this.startLaneChange(this.currentLane - 1);
      }
      
      if (input.right && this.currentLane < this.lanes.length - 1) {
        this.startLaneChange(this.currentLane + 1);
      }
    }
  }
  
  startLaneChange(newLane) {
    this.currentLane = newLane;
    this.isChangingLanes = true;
    this.laneChangeProgress = 0;
    this.laneChangeStartX = this.car.position.x;
    this.laneChangeTargetX = this.lanes[newLane];
    
    // Set target rotation and tilt based on direction - FIXED TILT DIRECTION
    const direction = this.laneChangeTargetX - this.laneChangeStartX;
    this.targetRotationY = direction > 0 ? this.maxSteerAngle : -this.maxSteerAngle;
    this.targetTiltZ = direction > 0 ? this.maxTiltAngle : -this.maxTiltAngle; // Fixed: removed negative sign
  }
  
  updateCarMovement() {
    if (!this.car) return;
    
    if (this.isChangingLanes) {
      // Update lane change progress
      this.laneChangeProgress += 1 / (this.laneChangeDuration * 60); // Assuming 60 FPS
      
      if (this.laneChangeProgress >= 1) {
        // Lane change complete
        this.laneChangeProgress = 1;
        this.isChangingLanes = false;
        this.car.position.x = this.laneChangeTargetX;
        
        // Start returning to neutral position
        this.targetRotationY = 0;
        this.targetTiltZ = 0;
      } else {
        // Smooth interpolation using easing function
        const easedProgress = this.easeInOutCubic(this.laneChangeProgress);
        this.car.position.x = THREE.MathUtils.lerp(
          this.laneChangeStartX,
          this.laneChangeTargetX,
          easedProgress
        );
      }
    }
    
    // Update player bounding box
    this.playerBoundingBox.setFromObject(this.car);
  }
  
  updateCarRotation() {
    if (!this.car) return;
    
    // Smooth interpolation for rotation and tilt
    const rotationSpeed = 0.15;
    const tiltSpeed = 0.12;
    
    this.carRotationY = THREE.MathUtils.lerp(this.carRotationY, this.targetRotationY, rotationSpeed);
    this.carTiltZ = THREE.MathUtils.lerp(this.carTiltZ, this.targetTiltZ, tiltSpeed);
    
    // Apply rotations to the car
    this.car.rotation.y = this.carRotationY;
    this.car.rotation.z = this.carTiltZ;
    
    // If we're close enough to neutral, snap to neutral
    if (Math.abs(this.carRotationY) < 0.01 && Math.abs(this.targetRotationY) < 0.01) {
      this.carRotationY = 0;
      this.car.rotation.y = 0;
    }
    
    if (Math.abs(this.carTiltZ) < 0.01 && Math.abs(this.targetTiltZ) < 0.01) {
      this.carTiltZ = 0;
      this.car.rotation.z = 0;
    }
  }
  
  // Easing function for smooth lane changes
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  updateCollision() {
    if (this.car && this.trafficSystem && !this.collisionDetected) {
      const collisionResult = this.trafficSystem.checkCollision(this.playerBoundingBox);
      if (collisionResult) {
        this.collisionDetected = true;
        this.collidedCar = collisionResult.car;
        
        console.log('💥 COLLISION DETECTED! Preparing physics animation...');
        
        // Don't set gameOver immediately - let the collision system handle it
        // this.gameOver = true;
      }
    }
  }
  
  // Method to get collision data for the collision system
  getCollisionData() {
    if (this.collisionDetected) {
      return {
        playerCar: this.car,
        otherCar: this.collidedCar,
        detected: true
      };
    }
    return { detected: false };
  }
  
  // Method to mark collision as processed
  processCollision() {
    this.gameOver = true;
  }
  
  // Getter for camera system to access car rotation for camera tilt
  getCarTilt() {
    return this.carTiltZ;
  }
  
  // Getter for current speed multiplier
  getSpeedMultiplier() {
    return this.currentSpeedMultiplier;
  }
  
  isGameOver() {
    return this.gameOver;
  }
  
  hasCollision() {
    return this.collisionDetected;
  }
  
  reset() {
    this.gameOver = false;
    this.collisionDetected = false;
    this.collidedCar = null;
    this.currentLane = 2;
    this.targetLaneX = this.lanes[this.currentLane];
    
    // Reset progressive speed system
    this.gameTime = 0;
    this.currentSpeedMultiplier = 1.0;
    
    // Reset lane changing state
    this.isChangingLanes = false;
    this.laneChangeProgress = 0;
    this.carRotationY = 0;
    this.carTiltZ = 0;
    this.targetRotationY = 0;
    this.targetTiltZ = 0;
    
    if (this.car) {
      this.car.position.set(this.targetLaneX, this.car.position.y, 0);
      this.car.rotation.y = 0;
      this.car.rotation.z = 0;
      
      // Reset car material to original bloom effect
      this.car.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.emissive = new THREE.Color(0x112211);
              mat.emissiveIntensity = 0.15;
            });
          } else {
            child.material.emissive = new THREE.Color(0x112211);
            child.material.emissiveIntensity = 0.15;
          }
        }
      });
    }
    
    // Clear all traffic cars for fresh start
    if (this.trafficSystem) {
      this.trafficSystem.cars.forEach(car => {
        this.scene.remove(car.mesh);
      });
      this.trafficSystem.cars = [];
    }
  }
}