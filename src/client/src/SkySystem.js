import * as THREE from 'three';

export class SkySystem {
  constructor(scene) {
    this.scene = scene;
    this.stars = null;
    this.starLights = [];
  }

  init() {
    this.createNightSky();
    this.createStars();
  }

  createNightSky() {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }

  createStars() {
    const starCount = 10000; // 10x more stars
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    let starLightCount = 0;
    const maxStarLights = 10;

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Distribute stars evenly on a sphere
      const radius = 100 + Math.random() * 250;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Random star colors
      const colorVariation = Math.random();
      if (colorVariation < 0.7) {
        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      } else if (colorVariation < 0.85) {
        colors[i3] = 0.8;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 1;
      } else {
        colors[i3] = 1;
        colors[i3 + 1] = 0.95;
        colors[i3 + 2] = 0.8;
      }

      // Add small light to a few stars
      if (Math.random() < 0.01 && y > 0 && starLightCount < maxStarLights) {
        const light = new THREE.PointLight(
          new THREE.Color(colors[i3], colors[i3 + 1], colors[i3 + 2]),
          0.1,
          100,
          2
        );
        light.position.set(x, y, z);
        this.scene.add(light);
        this.starLights.push(light);
        starLightCount++;
      }
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.7,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  update() {
    if (this.stars) {
      this.stars.rotation.y += 0.0001;
    }

    this.starLights.forEach((light, index) => {
      const time = Date.now() * 0.001;
      const twinkle = Math.sin(time * 2 + index) * 0.05 + 0.1;
      light.intensity = Math.max(0.05, twinkle);
    });
  }
}
