import * as THREE from 'three'

export class SunlightAnalyzer {
  constructor(scene, renderer, camera) {
    this.scene = scene
    this.renderer = renderer
    this.camera = camera
    
    this.sunLight = null
    this.ambientLight = null
    this.shadowCameraHelper = null
    
    this.hour = 12
    this.month = 6
    this.latitude = 39.9
    
    this.buildings = []
    this.lots = []
    this.citySize = 200
    
    this.analysisResults = null
    this.isEnabled = false
    
    this.init()
  }

  init() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    this.ambientLight.visible = false
    this.scene.add(this.ambientLight)

    this.sunLight = new THREE.DirectionalLight(0xffffcc, 1)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.width = 4096
    this.sunLight.shadow.mapSize.height = 4096
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 1500
    this.sunLight.shadow.camera.left = -400
    this.sunLight.shadow.camera.right = 400
    this.sunLight.shadow.camera.top = 400
    this.sunLight.shadow.camera.bottom = -400
    this.sunLight.shadow.bias = -0.0001
    this.sunLight.visible = false
    this.scene.add(this.sunLight)

    this.shadowCameraHelper = new THREE.CameraHelper(this.sunLight.shadow.camera)
    this.shadowCameraHelper.visible = false
    this.scene.add(this.shadowCameraHelper)
  }

  setBuildings(buildings, lots) {
    this.buildings = buildings
    this.lots = lots
  }

  setCitySize(size) {
    this.citySize = size
  }

  setTime(hour, month = 6) {
    this.hour = Math.max(5, Math.min(20, hour))
    this.month = Math.max(1, Math.min(12, month))
    this.updateSunPosition()
  }

  setLatitude(lat) {
    this.latitude = Math.max(-90, Math.min(90, lat))
    this.updateSunPosition()
  }

  updateSunPosition() {
    const { azimuth, altitude } = this.calculateSunPosition()
    
    const distance = 500
    const sunX = distance * Math.cos(altitude) * Math.sin(azimuth)
    const sunY = distance * Math.sin(altitude)
    const sunZ = distance * Math.cos(altitude) * Math.cos(azimuth)

    this.sunLight.position.set(sunX, sunY, sunZ)
    this.sunLight.target.position.set(0, 0, 0)
    this.sunLight.target.updateMatrixWorld()

    const intensity = Math.max(0.1, Math.sin(altitude))
    this.sunLight.intensity = intensity * 1.5

    const color = this.getSunColor(altitude)
    this.sunLight.color.setHex(color)
  }

  calculateSunPosition() {
    const dayOfYear = this.getDayOfYear(this.month)
    
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81)) * Math.PI / 180
    
    const hourAngle = (this.hour - 12) * 15 * Math.PI / 180
    const latRad = this.latitude * Math.PI / 180
    
    const sinAltitude = Math.sin(latRad) * Math.sin(declination) + 
                       Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle)
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)))
    
    let azimuth = 0
    if (altitude > -Math.PI / 2 + 0.01) {
      const cosAzimuth = (Math.sin(declination) - Math.sin(latRad) * sinAltitude) / 
                        (Math.cos(latRad) * Math.cos(altitude))
      azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)))
      if (hourAngle > 0) {
        azimuth = 2 * Math.PI - azimuth
      }
    }
    
    return { azimuth, altitude }
  }

  getDayOfYear(month) {
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    let day = 15
    for (let i = 0; i < month - 1; i++) {
      day += days[i]
    }
    return day
  }

  getSunColor(altitude) {
    const altitudeDeg = altitude * 180 / Math.PI
    if (altitudeDeg < 10) {
      return 0xff8844
    } else if (altitudeDeg < 20) {
      return 0xffcc88
    } else if (altitudeDeg < 30) {
      return 0xffffaa
    }
    return 0xffffcc
  }

  enable() {
    this.isEnabled = true
    this.sunLight.visible = true
    this.ambientLight.visible = true
    this.updateSunPosition()
  }

  disable() {
    this.isEnabled = false
    this.sunLight.visible = false
    this.ambientLight.visible = false
    this.shadowCameraHelper.visible = false
  }

  showShadowHelper(show) {
    this.shadowCameraHelper.visible = show
  }

  analyzeSunlight() {
    const results = {
      buildings: [],
      avgSunlightHours: 0,
      totalFloorArea: 0,
      litFloorArea: 0
    }

    const sampleHours = [6, 8, 10, 12, 14, 16, 18]
    
    this.lots.forEach((lot, index) => {
      const buildingData = {
        lotIndex: index,
        position: { x: lot.x + lot.width / 2, z: lot.z + lot.depth / 2 },
        sunlightHours: 0,
        shadowCoverage: 0
      }

      sampleHours.forEach(hour => {
        const oldHour = this.hour
        this.hour = hour
        const { altitude } = this.calculateSunPosition()
        
        if (altitude > 0) {
          const shadowCoverage = this.calculateShadowOnLot(lot)
          buildingData.shadowCoverage += shadowCoverage
          if (shadowCoverage < 0.7) {
            buildingData.sunlightHours += 2
          }
        }
        
        this.hour = oldHour
      })

      buildingData.shadowCoverage /= sampleHours.length
      results.buildings.push(buildingData)

      const floorArea = lot.width * lot.depth * 3
      results.totalFloorArea += floorArea
      results.litFloorArea += floorArea * (1 - buildingData.shadowCoverage)
    })

    results.avgSunlightHours = results.buildings.reduce((sum, b) => sum + b.sunlightHours, 0) / results.buildings.length
    results.sunlitRatio = results.litFloorArea / results.totalFloorArea

    this.analysisResults = results
    return results
  }

  calculateShadowOnLot(lot) {
    const { altitude, azimuth } = this.calculateSunPosition()
    if (altitude <= 0) return 1

    let maxShadowHeight = 0
    const lotCenterX = lot.x + lot.width / 2
    const lotCenterZ = lot.z + lot.depth / 2

    this.buildings.forEach(building => {
      const buildingPos = building.position
      const dx = lotCenterX - buildingPos.x
      const dz = lotCenterZ - buildingPos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      const angleToLot = Math.atan2(dx, dz)
      const angleDiff = Math.abs(angleToLot - azimuth)
      
      if (angleDiff < Math.PI / 3 && dist < 200) {
        const buildingHeight = this.getBuildingHeight(building)
        const shadowLength = buildingHeight / Math.tan(altitude)
        
        if (dist < shadowLength) {
          const shadowAtDist = buildingHeight - dist * Math.tan(altitude)
          maxShadowHeight = Math.max(maxShadowHeight, shadowAtDist)
        }
      }
    })

    return Math.min(1, maxShadowHeight / 50)
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

  getSunInfo() {
    const { azimuth, altitude } = this.calculateSunPosition()
    return {
      hour: this.hour,
      month: this.month,
      altitude: altitude * 180 / Math.PI,
      azimuth: azimuth * 180 / Math.PI,
      position: this.sunLight.position.clone(),
      intensity: this.sunLight.intensity
    }
  }

  dispose() {
    this.scene.remove(this.sunLight)
    this.scene.remove(this.ambientLight)
    this.scene.remove(this.shadowCameraHelper)
    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose()
    }
  }
}
