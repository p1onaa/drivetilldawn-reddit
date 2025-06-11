export class InputHandler {
  constructor() {
    this.keys = {
      left: false,
      right: false,
      restart: false
    };
    
    this.keyPressed = {
      left: false,
      right: false,
      restart: false
    };
    
    // Get button references for visual feedback
    this.leftButton = null;
    this.rightButton = null;
    
    this.setupEventListeners();
    this.setupTouchControls();
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });
    
    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    });
  }
  
  setupTouchControls() {
    this.leftButton = document.getElementById('leftArrow');
    this.rightButton = document.getElementById('rightArrow');
    
    if (this.leftButton) {
      // Mouse events
      this.leftButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.handleLeftPress();
      });
      
      this.leftButton.addEventListener('mouseup', (e) => {
        e.preventDefault();
        this.handleLeftRelease();
      });
      
      this.leftButton.addEventListener('mouseleave', (e) => {
        this.handleLeftRelease();
      });
      
      // Touch events
      this.leftButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleLeftPress();
      });
      
      this.leftButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleLeftRelease();
      });
      
      this.leftButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        this.handleLeftRelease();
      });
    }
    
    if (this.rightButton) {
      // Mouse events
      this.rightButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.handleRightPress();
      });
      
      this.rightButton.addEventListener('mouseup', (e) => {
        e.preventDefault();
        this.handleRightRelease();
      });
      
      this.rightButton.addEventListener('mouseleave', (e) => {
        this.handleRightRelease();
      });
      
      // Touch events
      this.rightButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleRightPress();
      });
      
      this.rightButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleRightRelease();
      });
      
      this.rightButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        this.handleRightRelease();
      });
    }
  }
  
  updateButtonVisuals() {
    // Update left button visual state
    if (this.leftButton) {
      if (this.keys.left) {
        this.leftButton.classList.add('pressed');
      } else {
        this.leftButton.classList.remove('pressed');
      }
    }
    
    // Update right button visual state
    if (this.rightButton) {
      if (this.keys.right) {
        this.rightButton.classList.add('pressed');
      } else {
        this.rightButton.classList.remove('pressed');
      }
    }
  }
  
  handleLeftPress() {
    if (!this.keys.left) {
      this.keyPressed.left = true;
    }
    this.keys.left = true;
    this.updateButtonVisuals();
  }
  
  handleLeftRelease() {
    this.keys.left = false;
    this.updateButtonVisuals();
  }
  
  handleRightPress() {
    if (!this.keys.right) {
      this.keyPressed.right = true;
    }
    this.keys.right = true;
    this.updateButtonVisuals();
  }
  
  handleRightRelease() {
    this.keys.right = false;
    this.updateButtonVisuals();
  }
  
  handleKeyDown(event) {
    switch(event.code) {
      case 'KeyA':
        this.handleLeftPress();
        event.preventDefault();
        break;
      case 'KeyD':
        this.handleRightPress();
        event.preventDefault();
        break;
      case 'Space':
        if (!this.keys.restart) {
          this.keyPressed.restart = true;
        }
        this.keys.restart = true;
        event.preventDefault();
        break;
    }
  }
  
  handleKeyUp(event) {
    switch(event.code) {
      case 'KeyA':
        this.handleLeftRelease();
        event.preventDefault();
        break;
      case 'KeyD':
        this.handleRightRelease();
        event.preventDefault();
        break;
      case 'Space':
        this.keys.restart = false;
        event.preventDefault();
        break;
    }
  }
  
  getInput() {
    const input = {
      left: this.keyPressed.left,
      right: this.keyPressed.right,
      restart: this.keyPressed.restart
    };
    
    // Reset pressed states
    this.keyPressed.left = false;
    this.keyPressed.right = false;
    this.keyPressed.restart = false;
    
    return input;
  }
}