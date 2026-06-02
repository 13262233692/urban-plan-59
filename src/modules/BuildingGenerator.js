import * as THREE from 'three'

export class BuildingGenerator {
  constructor(scene, options) {
    this.scene = scene
    this.minHeight = options.minHeight || 20
    this.maxHeight = options.maxHeight || 100
    this.density = options.density || 0.7
    this.wireframe = options.wireframe || false
    this.shadows = options.shadows !== undefined ? options.shadows : true
    this.buildings = []

    this.buildingColors = [
      0x8b7355,
      0x696969,
      0x4a4a4a,
      0x708090,
      0x778899,
      0x2f4f4f,
      0x556b2f,
      0x8b4513
    ]

    this.windowMaterials = this.createWindowMaterials()
  }

  createWindowMaterials() {
    const materials = []
    const colors = [0xffffcc, 0x87ceeb, 0xe6e6fa, 0xfff0f5]
    
    colors.forEach(color => {
      materials.push(new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.1
      }))
    })
    
    return materials
  }

  generate(lots) {
    this.buildings = []

    lots.forEach(lot => {
      if (Math.random() > this.density) return

      const building = this.createBuilding(lot)
      if (building) {
        this.scene.add(building)
        this.buildings.push(building)
      }
    })

    return this.buildings
  }

  createBuilding(lot) {
    const setback = lot.setback || 2
    const baseMargin = setback + 0.5
    const maxExtension = this.getMaxStyleExtension()
    const safeMargin = baseMargin + maxExtension
    
    const buildingWidth = Math.max(5, lot.width - safeMargin * 2)
    const buildingDepth = Math.max(5, lot.depth - safeMargin * 2)

    if (buildingWidth < 4 || buildingDepth < 4) return null

    const heightFactor = this.getHeightFactor(lot)
    const height = this.minHeight + (this.maxHeight - this.minHeight) * heightFactor

    const style = this.selectStyleByLotSize(buildingWidth, buildingDepth, height)
    let building

    const adjustedWidth = this.adjustDimensionForStyle(buildingWidth, style)
    const adjustedDepth = this.adjustDimensionForStyle(buildingDepth, style)

    switch (style) {
      case 0:
        building = this.createModernBuilding(adjustedWidth, adjustedDepth, height)
        break
      case 1:
        building = this.createClassicBuilding(adjustedWidth, adjustedDepth, height)
        break
      case 2:
        building = this.createSkyscraper(adjustedWidth, adjustedDepth, height)
        break
      default:
        building = this.createSimpleBuilding(adjustedWidth, adjustedDepth, height)
    }

    building.position.set(
      lot.x + lot.width / 2,
      0,
      lot.z + lot.depth / 2
    )

    return building
  }

  getMaxStyleExtension() {
    return 1.5
  }

  selectStyleByLotSize(width, depth, height) {
    const area = width * depth
    const minSkyscraperArea = 400
    const minClassicArea = 200
    
    if (height > this.maxHeight * 0.7 && area > minSkyscraperArea) {
      return 2
    } else if (area > minClassicArea && Math.random() > 0.5) {
      return 1
    } else if (Math.random() > 0.5) {
      return 0
    }
    return 3
  }

  adjustDimensionForStyle(dimension, style) {
    if (style === 1) {
      return dimension - 2
    } else if (style === 0) {
      return dimension - 0.5
    }
    return dimension
  }

  getHeightFactor(lot) {
    const centerX = 0
    const centerZ = 0
    const lotCenterX = lot.x + lot.width / 2
    const lotCenterZ = lot.z + lot.depth / 2
    const distFromCenter = Math.sqrt(lotCenterX * lotCenterX + lotCenterZ * lotCenterZ)
    const maxDist = 150

    const distFactor = Math.max(0, 1 - distFromCenter / maxDist)

    const area = lot.area || (lot.width * lot.depth)
    const minArea = 100
    const maxArea = 5000
    const areaFactor = Math.min(1, Math.max(0, (area - minArea) / (maxArea - minArea)))

    const sizeRatio = Math.min(lot.width, lot.depth) / Math.max(lot.width, lot.depth)
    const shapeFactor = sizeRatio * 0.3 + 0.7

    const randomFactor = 0.7 + Math.random() * 0.3

    const heightFactor = (distFactor * 0.35 + areaFactor * 0.35 + shapeFactor * 0.15 + randomFactor * 0.15)
    
    return Math.min(1, Math.max(0.1, heightFactor))
  }

  createSimpleBuilding(width, depth, height) {
    const group = new THREE.Group()

    const color = this.buildingColors[Math.floor(Math.random() * this.buildingColors.length)]
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1,
      wireframe: this.wireframe
    })

    const geometry = new THREE.BoxGeometry(width, height, depth)
    const body = new THREE.Mesh(geometry, material)
    body.position.y = height / 2
    body.castShadow = this.shadows
    body.receiveShadow = this.shadows
    group.add(body)

    this.addWindows(group, width, depth, height)

    return group
  }

  createModernBuilding(width, depth, height) {
    const group = new THREE.Group()

    const material = new THREE.MeshStandardMaterial({
      color: 0x5a6a7a,
      roughness: 0.3,
      metalness: 0.7,
      wireframe: this.wireframe
    })

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: this.wireframe
    })

    const geometry = new THREE.BoxGeometry(width, height, depth)
    const body = new THREE.Mesh(geometry, material)
    body.position.y = height / 2
    body.castShadow = this.shadows
    body.receiveShadow = this.shadows
    group.add(body)

    const sections = Math.floor(height / 15)
    const glassOffset = 0.15
    for (let i = 0; i < sections; i++) {
      if (Math.random() > 0.5) {
        const sectionHeight = height / sections
        const y = i * sectionHeight + sectionHeight / 2
        
        const glassGeo = new THREE.BoxGeometry(width - glassOffset, sectionHeight - 2, depth - glassOffset)
        const glass = new THREE.Mesh(glassGeo, glassMaterial)
        glass.position.y = y
        group.add(glass)
      }
    }

    return group
  }

  createClassicBuilding(width, depth, height) {
    const group = new THREE.Group()

    const material = new THREE.MeshStandardMaterial({
      color: 0xd4c5a9,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: this.wireframe
    })

    const baseHeight = height * 0.1
    const bodyHeight = height * 0.7
    const roofHeight = height * 0.2

    const baseExtension = 1.5
    const baseGeo = new THREE.BoxGeometry(width + baseExtension, baseHeight, depth + baseExtension)
    const base = new THREE.Mesh(baseGeo, material)
    base.position.y = baseHeight / 2
    base.castShadow = this.shadows
    base.receiveShadow = this.shadows
    group.add(base)

    const bodyGeo = new THREE.BoxGeometry(width, bodyHeight, depth)
    const body = new THREE.Mesh(bodyGeo, material)
    body.position.y = baseHeight + bodyHeight / 2
    body.castShadow = this.shadows
    body.receiveShadow = this.shadows
    group.add(body)

    const roofSize = Math.min(width, depth) * 0.7
    const roofGeo = new THREE.ConeGeometry(roofSize, roofHeight, 4)
    const roof = new THREE.Mesh(roofGeo, material)
    roof.position.y = baseHeight + bodyHeight + roofHeight / 2
    roof.rotation.y = Math.PI / 4
    roof.castShadow = this.shadows
    group.add(roof)

    this.addWindows(group, width, depth, bodyHeight, baseHeight)

    return group
  }

  createSkyscraper(width, depth, height) {
    const group = new THREE.Group()

    const material = new THREE.MeshStandardMaterial({
      color: 0x3d4f5f,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: this.wireframe
    })

    const mainScale = 0.85
    const mainWidth = width * mainScale
    const mainDepth = depth * mainScale
    
    const mainGeo = new THREE.BoxGeometry(mainWidth, height, mainDepth)
    const main = new THREE.Mesh(mainGeo, material)
    main.position.y = height / 2
    main.castShadow = this.shadows
    main.receiveShadow = this.shadows
    group.add(main)

    if (height > 60) {
      const setbackScale = 0.65
      const setbackHeight = height * 0.7
      const setbackGeo = new THREE.BoxGeometry(width * setbackScale, height * 0.3, depth * setbackScale)
      const setback = new THREE.Mesh(setbackGeo, material)
      setback.position.y = setbackHeight + (height * 0.3) / 2
      setback.castShadow = this.shadows
      setback.receiveShadow = this.shadows
      group.add(setback)
    }

    const antennaHeight = Math.min(height * 0.1, 15)
    const antennaGeo = new THREE.CylinderGeometry(0.3, 0.5, antennaHeight, 8)
    const antenna = new THREE.Mesh(antennaGeo, material)
    antenna.position.y = height + antennaHeight / 2
    antenna.castShadow = this.shadows
    group.add(antenna)

    this.addGridWindows(group, mainWidth, mainDepth, height)

    return group
  }

  addWindows(group, width, depth, height, baseY = 0) {
    const windowMaterial = this.windowMaterials[Math.floor(Math.random() * this.windowMaterials.length)]
    const windowRows = Math.max(3, Math.floor(height / 8))
    const windowCols = Math.max(2, Math.floor(width / 6))
    const windowSize = 1.5

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const y = baseY + (row + 0.5) * (height / windowRows)
        const x = (col - windowCols / 2 + 0.5) * (width / windowCols)
        
        const frontWindow = new THREE.Mesh(
          new THREE.BoxGeometry(windowSize, windowSize, 0.1),
          windowMaterial
        )
        frontWindow.position.set(x, y, depth / 2 + 0.05)
        group.add(frontWindow)

        const backWindow = new THREE.Mesh(
          new THREE.BoxGeometry(windowSize, windowSize, 0.1),
          windowMaterial
        )
        backWindow.position.set(x, y, -depth / 2 - 0.05)
        group.add(backWindow)
      }
    }
  }

  addGridWindows(group, width, depth, height) {
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x87ceeb,
      emissiveIntensity: 0.1
    })

    const rows = Math.floor(height / 4)
    const cols = Math.floor(width / 3)

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (Math.random() > 0.3) {
          const y = (i + 0.5) * (height / rows)
          const x = (j - cols / 2 + 0.5) * (width / cols)

          const win = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2, 0.1),
            windowMaterial
          )
          win.position.set(x, y, depth / 2 + 0.05)
          group.add(win)

          const win2 = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2, 0.1),
            windowMaterial
          )
          win2.position.set(x, y, -depth / 2 - 0.05)
          group.add(win2)
        }
      }
    }
  }

  getBuildings() {
    return this.buildings
  }
}
