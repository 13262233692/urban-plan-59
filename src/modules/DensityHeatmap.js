import * as THREE from 'three'

export class DensityHeatmap {
  constructor(scene, citySize = 200) {
    this.scene = scene
    this.citySize = citySize
    this.resolution = 128
    
    this.lots = []
    this.buildings = []
    
    this.heatmapMesh = null
    this.heatmapTexture = null
    this.canvas = null
    this.ctx = null
    
    this.isVisible = false
    this.mode = 'floorAreaRatio'
    
    this.legend = null
    this.colorScheme = 'viridis'
    
    this.init()
  }

  init() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.resolution
    this.canvas.height = this.resolution
    this.ctx = this.canvas.getContext('2d')
    
    this.heatmapTexture = new THREE.CanvasTexture(this.canvas)
    this.heatmapTexture.needsUpdate = true
    
    const geometry = new THREE.PlaneGeometry(this.citySize + 20, this.citySize + 20)
    const material = new THREE.MeshBasicMaterial({
      map: this.heatmapTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    })
    
    this.heatmapMesh = new THREE.Mesh(geometry, material)
    this.heatmapMesh.rotation.x = -Math.PI / 2
    this.heatmapMesh.position.y = 0.1
    this.heatmapMesh.visible = false
    this.scene.add(this.heatmapMesh)
  }

  setData(lots, buildings) {
    this.lots = lots
    this.buildings = buildings
  }

  setCitySize(size) {
    this.citySize = size
    if (this.heatmapMesh) {
      this.heatmapMesh.geometry.dispose()
      this.heatmapMesh.geometry = new THREE.PlaneGeometry(size + 20, size + 20)
    }
  }

  setMode(mode) {
    this.mode = mode
    if (this.isVisible) {
      this.update()
    }
  }

  setColorScheme(scheme) {
    this.colorScheme = scheme
    if (this.isVisible) {
      this.update()
    }
  }

  show() {
    this.isVisible = true
    this.heatmapMesh.visible = true
    this.update()
  }

  hide() {
    this.isVisible = false
    this.heatmapMesh.visible = false
  }

  toggle() {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  update() {
    const densityData = this.calculateDensity()
    this.renderHeatmap(densityData)
    this.heatmapTexture.needsUpdate = true
  }

  calculateDensity() {
    const gridSize = this.resolution
    const data = new Float32Array(gridSize * gridSize)
    const halfSize = this.citySize / 2
    
    switch (this.mode) {
      case 'floorAreaRatio':
        return this.calculateFAR(gridSize, halfSize)
      case 'buildingHeight':
        return this.calculateBuildingHeight(gridSize, halfSize)
      case 'populationDensity':
        return this.calculatePopulationDensity(gridSize, halfSize)
      case 'sunlightExposure':
        return this.calculateSunlightExposure(gridSize, halfSize)
      default:
        return this.calculateFAR(gridSize, halfSize)
    }
  }

  calculateFAR(gridSize, halfSize) {
    const data = new Float32Array(gridSize * gridSize)
    const cellSize = this.citySize / gridSize
    
    this.lots.forEach(lot => {
      const buildingHeight = this.getLotBuildingHeight(lot)
      const floors = Math.max(1, Math.floor(buildingHeight / 3.5))
      const far = (lot.width * lot.depth * floors) / (lot.width * lot.depth)
      
      const startX = Math.floor((lot.x + halfSize) / cellSize)
      const endX = Math.floor((lot.x + lot.width + halfSize) / cellSize)
      const startZ = Math.floor((lot.z + halfSize) / cellSize)
      const endZ = Math.floor((lot.z + lot.depth + halfSize) / cellSize)
      
      for (let x = startX; x <= endX && x < gridSize; x++) {
        for (let z = startZ; z <= endZ && z < gridSize; z++) {
          if (x >= 0 && z >= 0) {
            const idx = z * gridSize + x
            data[idx] = Math.max(data[idx], far)
          }
        }
      }
    })
    
    return { data, maxValue: 15, minValue: 0 }
  }

  calculateBuildingHeight(gridSize, halfSize) {
    const data = new Float32Array(gridSize * gridSize)
    const cellSize = this.citySize / gridSize
    
    this.lots.forEach(lot => {
      const buildingHeight = this.getLotBuildingHeight(lot)
      
      const startX = Math.floor((lot.x + halfSize) / cellSize)
      const endX = Math.floor((lot.x + lot.width + halfSize) / cellSize)
      const startZ = Math.floor((lot.z + halfSize) / cellSize)
      const endZ = Math.floor((lot.z + lot.depth + halfSize) / cellSize)
      
      for (let x = startX; x <= endX && x < gridSize; x++) {
        for (let z = startZ; z <= endZ && z < gridSize; z++) {
          if (x >= 0 && z >= 0) {
            const idx = z * gridSize + x
            data[idx] = Math.max(data[idx], buildingHeight)
          }
        }
      }
    })
    
    return { data, maxValue: 150, minValue: 0 }
  }

  calculatePopulationDensity(gridSize, halfSize) {
    const data = new Float32Array(gridSize * gridSize)
    const cellSize = this.citySize / gridSize
    const peoplePerSqm = 0.05
    
    this.lots.forEach(lot => {
      const buildingHeight = this.getLotBuildingHeight(lot)
      const floors = Math.max(1, Math.floor(buildingHeight / 3.5))
      const floorArea = lot.width * lot.depth * floors
      const population = floorArea * peoplePerSqm
      const density = population / (lot.width * lot.depth) * 1000
      
      const startX = Math.floor((lot.x + halfSize) / cellSize)
      const endX = Math.floor((lot.x + lot.width + halfSize) / cellSize)
      const startZ = Math.floor((lot.z + halfSize) / cellSize)
      const endZ = Math.floor((lot.z + lot.depth + halfSize) / cellSize)
      
      for (let x = startX; x <= endX && x < gridSize; x++) {
        for (let z = startZ; z <= endZ && z < gridSize; z++) {
          if (x >= 0 && z >= 0) {
            const idx = z * gridSize + x
            data[idx] = Math.max(data[idx], density)
          }
        }
      }
    })
    
    return { data, maxValue: 500, minValue: 0 }
  }

  calculateSunlightExposure(gridSize, halfSize) {
    const data = new Float32Array(gridSize * gridSize)
    const cellSize = this.citySize / gridSize
    
    const sampleHours = [8, 10, 12, 14, 16]
    
    this.lots.forEach(lot => {
      let sunlightScore = 0
      
      sampleHours.forEach(hour => {
        const altitude = this.getSunAltitude(hour)
        if (altitude > 0) {
          const shadowCoverage = this.estimateShadowCoverage(lot, hour)
          sunlightScore += (1 - shadowCoverage)
        }
      })
      
      sunlightScore = (sunlightScore / sampleHours.length) * 100
      
      const startX = Math.floor((lot.x + halfSize) / cellSize)
      const endX = Math.floor((lot.x + lot.width + halfSize) / cellSize)
      const startZ = Math.floor((lot.z + halfSize) / cellSize)
      const endZ = Math.floor((lot.z + lot.depth + halfSize) / cellSize)
      
      for (let x = startX; x <= endX && x < gridSize; x++) {
        for (let z = startZ; z <= endZ && z < gridSize; z++) {
          if (x >= 0 && z >= 0) {
            const idx = z * gridSize + x
            data[idx] = Math.max(data[idx], sunlightScore)
          }
        }
      }
    })
    
    return { data, maxValue: 100, minValue: 0 }
  }

  getSunAltitude(hour) {
    const latRad = 39.9 * Math.PI / 180
    const declination = 23.45 * Math.PI / 180
    const hourAngle = (hour - 12) * 15 * Math.PI / 180
    
    const sinAlt = Math.sin(latRad) * Math.sin(declination) + 
                   Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle)
    return Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  }

  estimateShadowCoverage(lot, hour) {
    const altitude = this.getSunAltitude(hour)
    if (altitude <= 0) return 1
    
    let maxShadow = 0
    const lotCenterX = lot.x + lot.width / 2
    const lotCenterZ = lot.z + lot.depth / 2
    
    this.lots.forEach(otherLot => {
      if (otherLot === lot) return
      
      const otherHeight = this.getLotBuildingHeight(otherLot)
      const otherCenterX = otherLot.x + otherLot.width / 2
      const otherCenterZ = otherLot.z + otherLot.depth / 2
      
      const dx = lotCenterX - otherCenterX
      const dz = lotCenterZ - otherCenterZ
      const dist = Math.sqrt(dx * dx + dz * dz)
      
      const shadowLength = otherHeight / Math.tan(altitude)
      if (dist < shadowLength && dist < 100) {
        maxShadow = Math.max(maxShadow, 1 - dist / shadowLength)
      }
    })
    
    return Math.min(1, maxShadow)
  }

  getLotBuildingHeight(lot) {
    const lotCenterX = lot.x + lot.width / 2
    const lotCenterZ = lot.z + lot.depth / 2
    
    for (const building of this.buildings) {
      const dist = Math.sqrt(
        Math.pow(building.position.x - lotCenterX, 2) +
        Math.pow(building.position.z - lotCenterZ, 2)
      )
      if (dist < Math.max(lot.width, lot.depth) / 2) {
        return this.getBuildingHeight(building)
      }
    }
    return 0
  }

  getBuildingHeight(building) {
    let maxY = 0
    building.traverse(child => {
      if (child.isMesh && child.geometry) {
        child.geometry.computeBoundingBox()
        const box = child.geometry.boundingBox
        if (box) {
          const localHeight = box.max.y
          const worldHeight = child.position.y + localHeight
          maxY = Math.max(maxY, worldHeight)
        }
      }
    })
    return maxY || 20
  }

  renderHeatmap({ data, maxValue, minValue }) {
    const imageData = this.ctx.createImageData(this.resolution, this.resolution)
    const pixels = imageData.data
    
    for (let i = 0; i < data.length; i++) {
      const value = (data[i] - minValue) / (maxValue - minValue)
      const color = this.getColor(Math.min(1, Math.max(0, value)))
      
      const idx = i * 4
      pixels[idx] = color.r
      pixels[idx + 1] = color.g
      pixels[idx + 2] = color.b
      pixels[idx + 3] = color.a * 255
    }
    
    this.ctx.putImageData(imageData, 0, 0)
  }

  getColor(value) {
    switch (this.colorScheme) {
      case 'viridis':
        return this.viridisColor(value)
      case 'plasma':
        return this.plasmaColor(value)
      case 'heat':
        return this.heatColor(value)
      case 'rainbow':
        return this.rainbowColor(value)
      default:
        return this.viridisColor(value)
    }
  }

  viridisColor(t) {
    const colors = [
      { r: 68, g: 1, b: 84, a: 0.8 },
      { r: 72, g: 40, b: 120, a: 0.8 },
      { r: 62, g: 74, b: 137, a: 0.8 },
      { r: 49, g: 104, b: 142, a: 0.8 },
      { r: 38, g: 130, b: 142, a: 0.8 },
      { r: 31, g: 158, b: 137, a: 0.8 },
      { r: 53, g: 183, b: 121, a: 0.8 },
      { r: 109, g: 205, b: 89, a: 0.8 },
      { r: 180, g: 222, b: 44, a: 0.8 },
      { r: 253, g: 231, b: 37, a: 0.8 }
    ]
    return this.interpolateColor(colors, t)
  }

  plasmaColor(t) {
    const colors = [
      { r: 13, g: 8, b: 135, a: 0.8 },
      { r: 75, g: 3, b: 161, a: 0.8 },
      { r: 127, g: 0, b: 168, a: 0.8 },
      { r: 173, g: 3, b: 157, a: 0.8 },
      { r: 210, g: 42, b: 130, a: 0.8 },
      { r: 237, g: 85, b: 101, a: 0.8 },
      { r: 252, g: 133, b: 74, a: 0.8 },
      { r: 254, g: 183, b: 52, a: 0.8 },
      { r: 240, g: 233, b: 59, a: 0.8 },
      { r: 240, g: 249, b: 33, a: 0.8 }
    ]
    return this.interpolateColor(colors, t)
  }

  heatColor(t) {
    const colors = [
      { r: 0, g: 0, b: 255, a: 0.7 },
      { r: 0, g: 255, b: 255, a: 0.7 },
      { r: 0, g: 255, b: 0, a: 0.7 },
      { r: 255, g: 255, b: 0, a: 0.7 },
      { r: 255, g: 0, b: 0, a: 0.7 }
    ]
    return this.interpolateColor(colors, t)
  }

  rainbowColor(t) {
    const hue = (1 - t) * 240
    return this.hslToRgb(hue, 100, 50)
  }

  hslToRgb(h, s, l) {
    s /= 100
    l /= 100
    const k = n => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = n =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
      a: 0.75
    }
  }

  interpolateColor(colors, t) {
    const idx = t * (colors.length - 1)
    const low = Math.floor(idx)
    const high = Math.min(low + 1, colors.length - 1)
    const fraction = idx - low
    
    return {
      r: Math.round(colors[low].r + (colors[high].r - colors[low].r) * fraction),
      g: Math.round(colors[low].g + (colors[high].g - colors[low].g) * fraction),
      b: Math.round(colors[low].b + (colors[high].b - colors[low].b) * fraction),
      a: colors[low].a + (colors[high].a - colors[low].a) * fraction
    }
  }

  getStats() {
    let totalBuildings = 0
    let totalHeight = 0
    let totalArea = 0
    let maxFar = 0
    
    this.lots.forEach(lot => {
      const height = this.getLotBuildingHeight(lot)
      if (height > 0) {
        totalBuildings++
        totalHeight += height
        totalArea += lot.width * lot.depth
        const floors = Math.floor(height / 3.5)
        const far = (lot.width * lot.depth * floors) / (lot.width * lot.depth)
        maxFar = Math.max(maxFar, far)
      }
    })
    
    return {
      totalBuildings,
      avgHeight: totalHeight / Math.max(1, totalBuildings),
      totalArea,
      maxFAR: maxFar,
      avgFAR: (totalHeight / 3.5 * totalArea / Math.max(1, totalBuildings)) / Math.max(1, totalArea)
    }
  }

  dispose() {
    this.scene.remove(this.heatmapMesh)
    if (this.heatmapMesh.geometry) {
      this.heatmapMesh.geometry.dispose()
    }
    if (this.heatmapMesh.material) {
      this.heatmapMesh.material.dispose()
    }
    if (this.heatmapTexture) {
      this.heatmapTexture.dispose()
    }
  }
}
