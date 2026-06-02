import * as THREE from 'three'

export class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera
    this.domElement = domElement

    this.moveSpeed = 80
    this.lookSpeed = 0.002
    this.height = 5

    this.moveForward = false
    this.moveBackward = false
    this.moveLeft = false
    this.moveRight = false
    this.moveUp = false
    this.moveDown = false

    this.pitch = 0
    this.yaw = 0

    this.velocity = new THREE.Vector3()
    this.direction = new THREE.Vector3()

    this.isLocked = false
    this.isPointerLocked = false

    this.init()
  }

  init() {
    this.camera.rotation.order = 'YXZ'

    document.addEventListener('keydown', (e) => this.onKeyDown(e))
    document.addEventListener('keyup', (e) => this.onKeyUp(e))
    this.domElement.addEventListener('click', () => this.onClick())
    document.addEventListener('mousemove', (e) => this.onMouseMove(e))
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange())
  }

  onClick() {
    if (!this.isPointerLocked) {
      this.domElement.requestPointerLock()
    }
  }

  onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true
        break
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true
        break
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true
        break
      case 'Space':
        this.moveUp = true
        event.preventDefault()
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveDown = true
        break
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false
        break
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false
        break
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false
        break
      case 'Space':
        this.moveUp = false
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveDown = false
        break
    }
  }

  onMouseMove(event) {
    if (!this.isPointerLocked) return

    const movementX = event.movementX || 0
    const movementY = event.movementY || 0

    this.yaw -= movementX * this.lookSpeed
    this.pitch -= movementY * this.lookSpeed

    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch))

    this.camera.rotation.x = this.pitch
    this.camera.rotation.y = this.yaw
  }

  update(delta) {
    this.velocity.x -= this.velocity.x * 10.0 * delta
    this.velocity.z -= this.velocity.z * 10.0 * delta
    this.velocity.y -= this.velocity.y * 10.0 * delta

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward)
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft)
    this.direction.y = Number(this.moveUp) - Number(this.moveDown)
    this.direction.normalize()

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * this.moveSpeed * delta
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * this.moveSpeed * delta
    }
    if (this.moveUp || this.moveDown) {
      this.velocity.y += this.direction.y * this.moveSpeed * delta
    }

    this.camera.translateX(this.velocity.x * delta)
    this.camera.translateZ(this.velocity.z * delta)
    this.camera.position.y += this.velocity.y * delta

    const minHeight = this.height
    if (this.camera.position.y < minHeight) {
      this.camera.position.y = minHeight
      this.velocity.y = 0
    }

    const maxHeight = 300
    if (this.camera.position.y > maxHeight) {
      this.camera.position.y = maxHeight
      this.velocity.y = 0
    }
  }

  setPosition(x, y, z) {
    this.camera.position.set(x, y, z)
  }

  setLookSpeed(speed) {
    this.lookSpeed = speed
  }

  setMoveSpeed(speed) {
    this.moveSpeed = speed
  }

  setHeight(height) {
    this.height = height
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    this.domElement.removeEventListener('click', this.onClick)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
  }
}
