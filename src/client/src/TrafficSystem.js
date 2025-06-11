import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class TrafficSystem {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.cars = [];
    this.carModels = [];
    this.lanes = [-4.5, -1.5, 1.5, 4.5];
    this.spawnDistance = -100; // Spawn cars far ahead of player
    this.despawnDistance = 50; // Remove cars when they pass behind player
    this.spawnTimer = 0;
    this.baseSpawnInterval = 45; // Base spawn interval
    this.isLoaded = false;
    
    // Base speeds for different traffic types
    this.baseOncomingSpeed = 0.6; // Speed of all oncoming cars
    
    // Collision detection parameters
    this.minCarDistance = 15; // Minimum distance between cars in same lane
    this.speedCheckDistance = 30; // Distance to check for cars ahead
  }
  
  async init() {
    await this.loadCarModels();
    this.isLoaded = true;
  }
  
  async loadCarModels() {
    const modelPromises = [];
    
    for (let i = 1; i <= 6; i++) {
      const promise = this.loader.loadAsync(`./models/${i}.glb`)
        .then(gltf => {
          const car = gltf.scene.clone();
          car.scale.setScalar(0.024);
          
          // Enhanced bloom effect for better visibility
          car.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Add bloom effect instead of glow
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    // Enhance material properties for bloom
                    mat.metalness = 0.3;
                    mat.roughness = 0.7;
                    mat.emissive = new THREE.Color(0x111122); // Subtle blue emissive
                    mat.emissiveIntensity = 0.1; // Low intensity for bloom
                  });
                } else {
                  child.material.metalness = 0.3;
                  child.material.roughness = 0.7;
                  child.material.emissive = new THREE.Color(0x111122);
                  child.material.emissiveIntensity = 0.1;
                }
              }
            }
          });
          
          return car;
        })
        .catch(error => {
          console.warn(`Failed to load model ${i}.glb:`, error);
          return this.createFallbackCar(i);
        });
      
      modelPromises.push(promise);
    }
    
    this.carModels = await Promise.all(modelPromises);
    console.log('Traffic car models loaded:', this.carModels.length);
  }
  
  createFallbackCar(index) {
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
    const geometry = new THREE.BoxGeometry(2, 1, 4);
    const material = new THREE.MeshLambertMaterial({ 
      color: colors[index - 1] || 0x888888,
      emissive: new THREE.Color(0x111122),
      emissiveIntensity: 0.1
    });
    const car = new THREE.Mesh(geometry, material);
    car.castShadow = true;
    car.receiveShadow = true;
    
    return car;
  }
  
  update(speedMultiplier = 1.0) {
    if (!this.isLoaded) return;
    
    // Adjust spawn rate based on speed - faster game = more frequent spawning
    const currentSpawnInterval = Math.max(
      this.baseSpawnInterval / speedMultiplier,
      20 // Minimum spawn interval to prevent overwhelming
    );
    
    this.spawnTimer++;
    if (this.spawnTimer >= currentSpawnInterval) {
      this.spawnCar(speedMultiplier);
      this.spawnTimer = 0;
    }
    
    this.updateCars(speedMultiplier);
    this.cleanupCars();
  }
  
  // Check if a lane is clear for spawning at a specific position
  isLaneClearForSpawn(laneIndex, spawnZ) {
    const carsInLane = this.cars.filter(car => car.lane === laneIndex);
    
    for (let car of carsInLane) {
      const distance = Math.abs(car.mesh.position.z - spawnZ);
      if (distance < this.minCarDistance) {
        return false;
      }
    }
    return true;
  }
  
  // Get the maximum allowed speed for a car based on cars ahead in the same lane
  getMaxAllowedSpeed(laneIndex, carZ, baseSpeed) {
    const carsInLane = this.cars.filter(car => car.lane === laneIndex);
    let maxSpeed = baseSpeed;
    
    // Check for cars ahead in the same direction
    for (let car of carsInLane) {
      const distance = car.mesh.position.z - carZ;
      
      // If there's a car ahead within checking distance
      if (distance > 0 && distance < this.speedCheckDistance) {
        // The car behind should not be faster than the car ahead
        maxSpeed = Math.min(maxSpeed, car.speed * 0.9); // Slightly slower to prevent catching up
      }
    }
    
    return Math.max(maxSpeed, 0.1); // Ensure minimum speed
  }
  
  spawnCar(speedMultiplier = 1.0) {
    if (Math.random() < 0.8) { // 80% chance to spawn a car
      const laneIndex = Math.floor(Math.random() * 4);
      const spawnZ = this.spawnDistance;
      
      // Check if lane is clear for spawning
      if (!this.isLaneClearForSpawn(laneIndex, spawnZ)) {
        return; // Skip spawning if lane is not clear
      }
      
      const modelIndex = Math.floor(Math.random() * this.carModels.length);
      const carModel = this.carModels[modelIndex].clone();
      
      // Position the car
      carModel.position.x = this.lanes[laneIndex];
      carModel.position.y = 0;
      carModel.position.z = spawnZ;
      
      // All cars are now oncoming traffic - spawn far ahead and move toward player
      // Apply speed multiplier to make traffic faster as game progresses
      const baseSpeed = this.baseOncomingSpeed + (Math.random() * 0.3 - 0.15); // Slight speed variation
      let speed = baseSpeed * speedMultiplier;
      
      // Check for cars ahead and adjust speed accordingly
      speed = this.getMaxAllowedSpeed(laneIndex, spawnZ, speed);
      
      const rotation = Math.PI; // Cars face toward player (correct orientation)
      carModel.rotation.y = rotation;
      
      // Create car object with metadata
      const carData = {
        mesh: carModel,
        speed: speed,
        lane: laneIndex,
        boundingBox: new THREE.Box3().setFromObject(carModel),
        originalSpeed: speed // Store original speed for reference
      };
      
      this.cars.push(carData);
      this.scene.add(carModel);
    }
  }
  
  updateCars(speedMultiplier = 1.0) {
    // Sort cars by lane and position for proper speed adjustment
    const carsByLane = {};
    this.cars.forEach(car => {
      if (!carsByLane[car.lane]) {
        carsByLane[car.lane] = [];
      }
      carsByLane[car.lane].push(car);
    });
    
    // Sort cars in each lane by Z position (front to back)
    Object.keys(carsByLane).forEach(laneIndex => {
      carsByLane[laneIndex].sort((a, b) => a.mesh.position.z - b.mesh.position.z);
    });
    
    // Update each car's speed based on the car ahead
    Object.keys(carsByLane).forEach(laneIndex => {
      const carsInLane = carsByLane[laneIndex];
      
      for (let i = 0; i < carsInLane.length; i++) {
        const car = carsInLane[i];
        let targetSpeed = car.originalSpeed;
        
        // Check if there's a car ahead
        if (i > 0) {
          const carAhead = carsInLane[i - 1];
          const distance = carAhead.mesh.position.z - car.mesh.position.z;
          
          // If too close to car ahead, slow down
          if (distance < this.minCarDistance) {
            targetSpeed = Math.min(targetSpeed, carAhead.speed * 0.8);
          } else if (distance < this.speedCheckDistance) {
            // Gradually adjust speed based on distance
            const speedRatio = distance / this.speedCheckDistance;
            targetSpeed = Math.min(targetSpeed, carAhead.speed * (0.8 + speedRatio * 0.2));
          }
        }
        
        // Smooth speed transition
        car.speed = THREE.MathUtils.lerp(car.speed, targetSpeed, 0.05);
        
        // Move the car
        car.mesh.position.z += car.speed;
        
        // Update bounding box
        car.boundingBox.setFromObject(car.mesh);
        
        // Add subtle movement variation for realism
        const time = Date.now() * 0.001;
        car.mesh.position.y = Math.sin(time * 2 + car.mesh.position.x) * 0.02;
      }
    });
  }
  
  cleanupCars() {
    this.cars = this.cars.filter(car => {
      const shouldRemove = car.mesh.position.z > this.despawnDistance || 
                          car.mesh.position.z < this.spawnDistance - 20;
      
      if (shouldRemove) {
        this.scene.remove(car.mesh);
        return false;
      }
      return true;
    });
  }
  
  checkCollision(playerBoundingBox) {
    for (let car of this.cars) {
      if (playerBoundingBox.intersectsBox(car.boundingBox)) {
        return {
          collision: true,
          car: car.mesh
        };
      }
    }
    return null;
  }
  
  getCars() {
    return this.cars;
  }
}