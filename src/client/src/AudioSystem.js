export class AudioSystem {
  constructor() {
    this.engineSound = null;
    this.laneChangeSound = null;
    this.collisionSound = null;
    this.isEngineRunning = false;
    this.audioContext = null;
    this.engineGainNode = null;
    this.laneChangeGainNode = null;
    this.collisionGainNode = null;
    
    this.init();
  }
  
  async init() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create gain nodes for volume control
      this.engineGainNode = this.audioContext.createGain();
      this.laneChangeGainNode = this.audioContext.createGain();
      this.collisionGainNode = this.audioContext.createGain();
      
      // Connect gain nodes to destination
      this.engineGainNode.connect(this.audioContext.destination);
      this.laneChangeGainNode.connect(this.audioContext.destination);
      this.collisionGainNode.connect(this.audioContext.destination);
      
      // Set initial volumes
      this.engineGainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime); // 30% volume for engine
      this.laneChangeGainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime); // 50% volume for lane change
      this.collisionGainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime); // 70% volume for collision
      
      // Load audio files
      await this.loadAudioFiles();
      
      console.log('Audio system initialized successfully');
    } catch (error) {
      console.warn('Audio system initialization failed:', error);
    }
  }
  
  async loadAudioFiles() {
    try {
      // Load engine sound
      const engineResponse = await fetch('./audio/engine.flac');
      const engineArrayBuffer = await engineResponse.arrayBuffer();
      this.engineSound = await this.audioContext.decodeAudioData(engineArrayBuffer);
      
      // Load lane change sound
      const laneChangeResponse = await fetch('./audio/changelane.flac');
      const laneChangeArrayBuffer = await laneChangeResponse.arrayBuffer();
      this.laneChangeSound = await this.audioContext.decodeAudioData(laneChangeArrayBuffer);
      
      // Load collision sound
      const collisionResponse = await fetch('./audio/collision.flac');
      const collisionArrayBuffer = await collisionResponse.arrayBuffer();
      this.collisionSound = await this.audioContext.decodeAudioData(collisionArrayBuffer);
      
      console.log('Audio files loaded successfully');
    } catch (error) {
      console.warn('Failed to load audio files:', error);
    }
  }
  
  startEngine() {
    if (!this.engineSound || this.isEngineRunning) return;
    
    try {
      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create and configure engine source
      this.engineSource = this.audioContext.createBufferSource();
      this.engineSource.buffer = this.engineSound;
      this.engineSource.loop = true; // Loop the engine sound
      this.engineSource.connect(this.engineGainNode);
      
      // Start playing
      this.engineSource.start(0);
      this.isEngineRunning = true;
      
      console.log('🎵 Engine sound started');
    } catch (error) {
      console.warn('Failed to start engine sound:', error);
    }
  }
  
  stopEngine() {
    if (!this.isEngineRunning || !this.engineSource) return;
    
    try {
      // Fade out the engine sound for smooth stop
      const currentTime = this.audioContext.currentTime;
      this.engineGainNode.gain.setValueAtTime(this.engineGainNode.gain.value, currentTime);
      this.engineGainNode.gain.linearRampToValueAtTime(0, currentTime + 0.5); // 0.5 second fade out
      
      // Stop the source after fade out
      setTimeout(() => {
        if (this.engineSource) {
          this.engineSource.stop();
          this.engineSource = null;
        }
        // Reset gain for next time
        this.engineGainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      }, 500);
      
      this.isEngineRunning = false;
      
      console.log('🎵 Engine sound stopped');
    } catch (error) {
      console.warn('Failed to stop engine sound:', error);
    }
  }
  
  playLaneChange() {
    if (!this.laneChangeSound) return;
    
    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create and configure lane change source
      const laneChangeSource = this.audioContext.createBufferSource();
      laneChangeSource.buffer = this.laneChangeSound;
      laneChangeSource.connect(this.laneChangeGainNode);
      
      // Play the sound once
      laneChangeSource.start(0);
      
      console.log('🎵 Lane change sound played');
    } catch (error) {
      console.warn('Failed to play lane change sound:', error);
    }
  }
  
  playCollision() {
    if (!this.collisionSound) return;
    
    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create and configure collision source
      const collisionSource = this.audioContext.createBufferSource();
      collisionSource.buffer = this.collisionSound;
      collisionSource.connect(this.collisionGainNode);
      
      // Play the sound once
      collisionSource.start(0);
      
      console.log('💥 Collision sound played');
    } catch (error) {
      console.warn('Failed to play collision sound:', error);
    }
  }
  
  // Update engine pitch based on speed (optional enhancement)
  updateEngineSpeed(speedMultiplier) {
    if (!this.isEngineRunning || !this.engineSource) return;
    
    try {
      // Adjust playback rate based on speed (1.0 = normal, higher = faster)
      const minRate = 0.8;
      const maxRate = 1.5;
      const normalizedSpeed = Math.min(speedMultiplier / 10, 1); // Normalize to 0-1
      const playbackRate = minRate + (normalizedSpeed * (maxRate - minRate));
      
      // Note: playbackRate can only be set at source creation, so we'll skip this for now
      // This would require recreating the source periodically, which might cause audio glitches
    } catch (error) {
      console.warn('Failed to update engine speed:', error);
    }
  }
  
  // Cleanup method
  dispose() {
    this.stopEngine();
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}