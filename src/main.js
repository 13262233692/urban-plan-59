import * as THREE from 'three'
import { LotDivider } from './modules/LotDivider.js'
import { BuildingGenerator } from './modules/BuildingGenerator.js'
import { RoadNetwork } from './modules/RoadNetwork.js'
import { FirstPersonControls } from './modules/FirstPersonControls.js'
import { RenderOptimizer } from './modules/RenderOptimizer.js'
import { SunlightAnalyzer } from './modules/SunlightAnalyzer.js'
import { DensityHeatmap } from './modules/DensityHeatmap.js'
import './style.css'

class CityGeneratorApp {
  constructor() {
    this.container = document.getElementById('canvas-container')
    this.params = this.getDefaultParams()
    this.buildings = []
    this.lots = []
    this.roads = null
    this.stats = { buildingCount: 0, lotCount: 0 }
    
    this.init()
    this.setupControls()
    this.generateCity()
    this.animate()
  }

  getDefaultParams() {
    return {
      citySize: 4,
      lotSize: 40,
      splitDepth: 3,
      minHeight: 20,
      maxHeight: 100,
      density: 0.7,
      mainRoadWidth: 8,
      secondaryRoadWidth: 5,
      wireframe: false,
      shadows: true,
      sunlightEnabled: false,
      sunHour: 12,
      sunMonth: 6,
      latitude: 39.9,
      heatmapEnabled: false,
      heatmapMode: 'floorAreaRatio',
      colorScheme: 'viridis',
      heatmapOpacity: 0.7
    }
  }

  init() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 200, 800)

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    this.camera.position.set(0, 50, 100)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    this.setupLighting()
    this.setupGround()

    this.controls = new FirstPersonControls(this.camera, this.renderer.domElement)
    this.optimizer = new RenderOptimizer(this.renderer, this.scene)
    
    this.sunlightAnalyzer = new SunlightAnalyzer(this.scene, this.renderer, this.camera)
    this.heatmap = new DensityHeatmap(this.scene, 200)

    window.addEventListener('resize', () => this.onWindowResize())
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambientLight)

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1)
    this.sunLight.position.set(100, 200, 100)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.width = 4096
    this.sunLight.shadow.mapSize.height = 4096
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 1000
    this.sunLight.shadow.camera.left = -300
    this.sunLight.shadow.camera.right = 300
    this.sunLight.shadow.camera.top = 300
    this.sunLight.shadow.camera.bottom = -300
    this.scene.add(this.sunLight)

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d26, 0.3)
    this.scene.add(hemisphereLight)
  }

  setupGround() {
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.9
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    this.ground = ground
  }

  setupControls() {
    const elements = {
      citySize: document.getElementById('citySize'),
      lotSize: document.getElementById('lotSize'),
      splitDepth: document.getElementById('splitDepth'),
      minHeight: document.getElementById('minHeight'),
      maxHeight: document.getElementById('maxHeight'),
      density: document.getElementById('density'),
      mainRoadWidth: document.getElementById('mainRoadWidth'),
      secondaryRoadWidth: document.getElementById('secondaryRoadWidth'),
      wireframe: document.getElementById('wireframe'),
      shadows: document.getElementById('shadows'),
      sunlightEnabled: document.getElementById('sunlightEnabled'),
      sunHour: document.getElementById('sunHour'),
      sunMonth: document.getElementById('sunMonth'),
      latitude: document.getElementById('latitude'),
      heatmapEnabled: document.getElementById('heatmapEnabled'),
      heatmapMode: document.getElementById('heatmapMode'),
      colorScheme: document.getElementById('colorScheme'),
      heatmapOpacity: document.getElementById('heatmapOpacity')
    }

    Object.keys(elements).forEach(key => {
      const el = elements[key]
      if (el.type === 'checkbox') {
        el.addEventListener('change', (e) => {
          this.params[key] = e.target.checked
          this.handleParamChange(key, e.target.checked)
        })
      } else if (el.tagName === 'SELECT') {
        el.addEventListener('change', (e) => {
          this.params[key] = e.target.value
          this.handleParamChange(key, e.target.value)
        })
      } else {
        el.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value)
          this.params[key] = value
          const valueEl = document.getElementById(key + 'Value')
          if (valueEl) {
            if (key === 'latitude') {
              valueEl.textContent = value.toFixed(1) + '°'
            } else {
              valueEl.textContent = value
            }
          }
          this.handleParamChange(key, value)
        })
      }
    })

    document.getElementById('generateBtn').addEventListener('click', () => this.generateCity())
    document.getElementById('randomBtn').addEventListener('click', () => this.randomGenerate())
    document.getElementById('analyzeSunlight').addEventListener('click', () => this.analyzeSunlight())
  }

  handleParamChange(key, value) {
    switch (key) {
      case 'shadows':
        this.renderer.shadowMap.enabled = value
        break
      case 'sunlightEnabled':
        this.toggleSunlight(value)
        break
      case 'sunHour':
      case 'sunMonth':
      case 'latitude':
        if (this.params.sunlightEnabled) {
          this.sunlightAnalyzer.setTime(this.params.sunHour, this.params.sunMonth)
          this.sunlightAnalyzer.setLatitude(this.params.latitude)
        }
        break
      case 'heatmapEnabled':
        this.toggleHeatmap(value)
        break
      case 'heatmapMode':
        if (this.params.heatmapEnabled) {
          this.heatmap.setMode(value)
        }
        break
      case 'colorScheme':
        if (this.params.heatmapEnabled) {
          this.heatmap.setColorScheme(value)
        }
        break
      case 'heatmapOpacity':
        if (this.heatmap.heatmapMesh) {
          this.heatmap.heatmapMesh.material.opacity = value
        }
        break
    }
  }

  toggleSunlight(enabled) {
    if (enabled) {
      this.sunlightAnalyzer.enable()
      this.sunLight.visible = false
      this.ambientLight.visible = false
    } else {
      this.sunlightAnalyzer.disable()
      this.sunLight.visible = true
      this.ambientLight.visible = true
    }
  }

  toggleHeatmap(enabled) {
    if (enabled) {
      this.heatmap.show()
    } else {
      this.heatmap.hide()
    }
  }

  analyzeSunlight() {
    if (this.buildings.length === 0) return
    
    const results = this.sunlightAnalyzer.analyzeSunlight()
    alert(`日照分析完成！\n平均日照时间: ${results.avgSunlightHours.toFixed(1)}小时\n采光率: ${(results.sunlitRatio * 100).toFixed(1)}%`)
  }

  randomGenerate() {
    this.params.citySize = Math.floor(Math.random() * 5) + 3
    this.params.lotSize = Math.floor(Math.random() * 40) + 30
    this.params.splitDepth = Math.floor(Math.random() * 3) + 2
    this.params.minHeight = Math.floor(Math.random() * 20) + 10
    this.params.maxHeight = Math.floor(Math.random() * 100) + 80
    this.params.density = Math.random() * 0.4 + 0.5
    this.params.mainRoadWidth = Math.floor(Math.random() * 8) + 5
    this.params.secondaryRoadWidth = Math.floor(Math.random() * 5) + 3

    this.updateUIFromParams()
    this.generateCity()
  }

  updateUIFromParams() {
    const params = this.params
    document.getElementById('citySize').value = params.citySize
    document.getElementById('citySizeValue').textContent = params.citySize
    document.getElementById('lotSize').value = params.lotSize
    document.getElementById('lotSizeValue').textContent = params.lotSize
    document.getElementById('splitDepth').value = params.splitDepth
    document.getElementById('splitDepthValue').textContent = params.splitDepth
    document.getElementById('minHeight').value = params.minHeight
    document.getElementById('minHeightValue').textContent = params.minHeight
    document.getElementById('maxHeight').value = params.maxHeight
    document.getElementById('maxHeightValue').textContent = params.maxHeight
    document.getElementById('density').value = params.density
    document.getElementById('densityValue').textContent = params.density.toFixed(2)
    document.getElementById('mainRoadWidth').value = params.mainRoadWidth
    document.getElementById('mainRoadWidthValue').textContent = params.mainRoadWidth
    document.getElementById('secondaryRoadWidth').value = params.secondaryRoadWidth
    document.getElementById('secondaryRoadWidthValue').textContent = params.secondaryRoadWidth
  }

  generateCity() {
    document.getElementById('loading').style.display = 'block'
    
    setTimeout(() => {
      this.clearCity()

      const totalSize = this.params.citySize * this.params.lotSize
      
      const lotDivider = new LotDivider({
        size: totalSize,
        splitDepth: this.params.splitDepth,
        mainRoadWidth: this.params.mainRoadWidth,
        secondaryRoadWidth: this.params.secondaryRoadWidth
      })
      
      this.lots = lotDivider.divide()
      this.stats.lotCount = this.lots.length

      this.roads = new RoadNetwork(this.scene, {
        size: totalSize,
        lots: this.lots,
        mainRoadWidth: this.params.mainRoadWidth,
        secondaryRoadWidth: this.params.secondaryRoadWidth
      })
      this.roads.generate()

      const buildingGenerator = new BuildingGenerator(this.scene, {
        minHeight: this.params.minHeight,
        maxHeight: this.params.maxHeight,
        density: this.params.density,
        wireframe: this.params.wireframe,
        shadows: this.params.shadows
      })

      this.buildings = buildingGenerator.generate(this.lots)
      this.stats.buildingCount = this.buildings.length

      this.optimizer.optimize(this.buildings)

      this.sunlightAnalyzer.setBuildings(this.buildings, this.lots)
      this.sunlightAnalyzer.setCitySize(totalSize)
      
      this.heatmap.setData(this.lots, this.buildings)
      this.heatmap.setCitySize(totalSize)
      
      if (this.params.heatmapEnabled) {
        this.heatmap.update()
      }

      if (this.params.sunlightEnabled) {
        this.sunlightAnalyzer.setTime(this.params.sunHour, this.params.sunMonth)
        this.sunlightAnalyzer.setLatitude(this.params.latitude)
      }
      
      this.updateStats()
      document.getElementById('loading').style.display = 'none'
    }, 50)
  }

  clearCity() {
    this.buildings.forEach(building => {
      this.scene.remove(building)
      if (building.geometry) building.geometry.dispose()
      if (building.material) {
        if (Array.isArray(building.material)) {
          building.material.forEach(m => m.dispose())
        } else {
          building.material.dispose()
        }
      }
    })
    this.buildings = []

    if (this.roads) {
      this.roads.clear()
    }
  }

  updateStats() {
    document.getElementById('buildingCount').textContent = this.stats.buildingCount
    document.getElementById('lotCount').textContent = this.stats.lotCount
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  animate() {
    requestAnimationFrame(() => this.animate())

    const delta = performance.now() - (this.lastTime || 0)
    this.lastTime = performance.now()
    
    if (delta > 0) {
      const fps = Math.round(1000 / delta)
      document.getElementById('fps').textContent = fps
    }

    this.controls.update(delta / 1000)
    this.renderer.render(this.scene, this.camera)
  }
}

new CityGeneratorApp()
