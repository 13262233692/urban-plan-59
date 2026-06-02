import * as THREE from 'three'

export class RoadNetwork {
  constructor(scene, options) {
    this.scene = scene
    this.size = options.size || 200
    this.lots = options.lots || []
    this.mainRoadWidth = options.mainRoadWidth || 8
    this.secondaryRoadWidth = options.secondaryRoadWidth || 5
    this.roadMeshes = []
  }

  generate() {
    this.createGroundPlane()
    this.createMainRoads()
    this.createSecondaryRoads()
    this.createRoadMarkings()
  }

  createGroundPlane() {
    const halfSize = this.size / 2 + 50

    const geometry = new THREE.PlaneGeometry(halfSize * 2, halfSize * 2)
    const material = new THREE.MeshStandardMaterial({
      color: 0x3d3d3d,
      roughness: 0.9
    })

    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0.01
    ground.receiveShadow = true
    this.scene.add(ground)
    this.roadMeshes.push(ground)
  }

  createMainRoads() {
    const halfSize = this.size / 2
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8
    })

    for (let i = 0; i <= 1; i++) {
      const horizontalRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.size + 20, this.mainRoadWidth),
        roadMaterial
      )
      horizontalRoad.rotation.x = -Math.PI / 2
      horizontalRoad.position.y = 0.02
      horizontalRoad.position.z = i === 0 ? -halfSize / 2 : halfSize / 2
      horizontalRoad.receiveShadow = true
      this.scene.add(horizontalRoad)
      this.roadMeshes.push(horizontalRoad)

      const verticalRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.mainRoadWidth, this.size + 20),
        roadMaterial
      )
      verticalRoad.rotation.x = -Math.PI / 2
      verticalRoad.position.y = 0.02
      verticalRoad.position.x = i === 0 ? -halfSize / 2 : halfSize / 2
      verticalRoad.receiveShadow = true
      this.scene.add(verticalRoad)
      this.roadMeshes.push(verticalRoad)
    }
  }

  createSecondaryRoads() {
    const halfSize = this.size / 2
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.85
    })

    const gridSize = Math.ceil(Math.sqrt(this.lots.length / 2))
    const cellSize = this.size / gridSize

    for (let i = 1; i < gridSize; i++) {
      const hRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.size, this.secondaryRoadWidth),
        roadMaterial
      )
      hRoad.rotation.x = -Math.PI / 2
      hRoad.position.y = 0.02
      hRoad.position.z = -halfSize + i * cellSize
      hRoad.receiveShadow = true
      this.scene.add(hRoad)
      this.roadMeshes.push(hRoad)

      const vRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.secondaryRoadWidth, this.size),
        roadMaterial
      )
      vRoad.rotation.x = -Math.PI / 2
      vRoad.position.y = 0.02
      vRoad.position.x = -halfSize + i * cellSize
      vRoad.receiveShadow = true
      this.scene.add(vRoad)
      this.roadMeshes.push(vRoad)
    }

    this.createSidewalks()
  }

  createSidewalks() {
    const halfSize = this.size / 2
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9
    })

    const sidewalkWidth = 2
    const gridSize = Math.ceil(Math.sqrt(this.lots.length / 2))
    const cellSize = this.size / gridSize

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = -halfSize + i * cellSize
        const z = -halfSize + j * cellSize

        if (i < gridSize) {
          const hSidewalk = new THREE.Mesh(
            new THREE.PlaneGeometry(cellSize, sidewalkWidth),
            sidewalkMaterial
          )
          hSidewalk.rotation.x = -Math.PI / 2
          hSidewalk.position.set(
            x + cellSize / 2,
            0.03,
            z + (this.secondaryRoadWidth + sidewalkWidth) / 2
          )
          hSidewalk.receiveShadow = true
          this.scene.add(hSidewalk)
          this.roadMeshes.push(hSidewalk)
        }

        if (j < gridSize) {
          const vSidewalk = new THREE.Mesh(
            new THREE.PlaneGeometry(sidewalkWidth, cellSize),
            sidewalkMaterial
          )
          vSidewalk.rotation.x = -Math.PI / 2
          vSidewalk.position.set(
            x + (this.secondaryRoadWidth + sidewalkWidth) / 2,
            0.03,
            z + cellSize / 2
          )
          vSidewalk.receiveShadow = true
          this.scene.add(vSidewalk)
          this.roadMeshes.push(vSidewalk)
        }
      }
    }
  }

  createRoadMarkings() {
    const halfSize = this.size / 2
    const markingMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      roughness: 0.5,
      emissive: 0xffff00,
      emissiveIntensity: 0.2
    })

    const gridSize = Math.ceil(Math.sqrt(this.lots.length / 2))
    const cellSize = this.size / gridSize

    for (let i = 1; i < gridSize; i++) {
      const lineCount = Math.floor(cellSize / 4)
      for (let j = 0; j < lineCount; j++) {
        const hMarking = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 0.2),
          markingMaterial
        )
        hMarking.rotation.x = -Math.PI / 2
        hMarking.position.y = 0.05
        hMarking.position.set(
          -halfSize + j * 4 + 2,
          0,
          -halfSize + i * cellSize
        )
        this.scene.add(hMarking)
        this.roadMeshes.push(hMarking)

        const vMarking = new THREE.Mesh(
          new THREE.PlaneGeometry(0.2, 2),
          markingMaterial
        )
        vMarking.rotation.x = -Math.PI / 2
        vMarking.position.y = 0.05
        vMarking.position.set(
          -halfSize + i * cellSize,
          0,
          -halfSize + j * 4 + 2
        )
        this.scene.add(vMarking)
        this.roadMeshes.push(vMarking)
      }
    }
  }

  clear() {
    this.roadMeshes.forEach(mesh => {
      this.scene.remove(mesh)
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose())
        } else {
          mesh.material.dispose()
        }
      }
    })
    this.roadMeshes = []
  }
}
