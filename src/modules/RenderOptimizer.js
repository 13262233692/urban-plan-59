import * as THREE from 'three'

export class RenderOptimizer {
  constructor(renderer, scene) {
    this.renderer = renderer
    this.scene = scene
    this.frustumCulled = true
  }

  optimize(buildings) {
    buildings.forEach(building => {
      this.optimizeBuilding(building)
    })

    this.setupLOD(buildings)
  }

  optimizeBuilding(building) {
    if (building.isGroup) {
      building.children.forEach(child => {
        if (child.isMesh) {
          this.optimizeMesh(child)
        }
      })
    } else if (building.isMesh) {
      this.optimizeMesh(building)
    }
  }

  optimizeMesh(mesh) {
    if (mesh.geometry) {
      mesh.geometry.computeBoundingSphere()
      mesh.geometry.computeBoundingBox()
    }

    mesh.frustumCulled = this.frustumCulled
    mesh.matrixAutoUpdate = true
  }

  setupLOD(buildings) {
    buildings.forEach(building => {
      if (building.isGroup && building.children.length > 0) {
        const mainMesh = building.children.find(child => child.isMesh)
        if (mainMesh) {
          const distance = this.getBuildingDistance(mainMesh)
          
          if (distance > 200) {
            building.children.forEach(child => {
              if (child.isMesh && child.geometry) {
                child.visible = child === mainMesh
              }
            })
          }
        }
      }
    })
  }

  getBuildingDistance(mesh) {
    if (!mesh.geometry || !mesh.geometry.boundingSphere) {
      return 0
    }
    return mesh.geometry.boundingSphere.radius
  }

  mergeGeometries(buildings) {
    const geometries = []
    const materials = []

    buildings.forEach(building => {
      if (building.isGroup) {
        building.children.forEach(child => {
          if (child.isMesh) {
            child.updateMatrixWorld()
            const clonedGeometry = child.geometry.clone()
            clonedGeometry.applyMatrix4(child.matrixWorld)
            geometries.push(clonedGeometry)
            materials.push(child.material)
          }
        })
      } else if (building.isMesh) {
        building.updateMatrixWorld()
        const clonedGeometry = building.geometry.clone()
        clonedGeometry.applyMatrix4(building.matrixWorld)
        geometries.push(clonedGeometry)
        materials.push(building.material)
      }
    })

    return { geometries, materials }
  }

  enableFrustumCulling(enabled) {
    this.frustumCulled = enabled
  }

  setPixelRatio(ratio) {
    this.renderer.setPixelRatio(Math.min(ratio, window.devicePixelRatio))
  }

  optimizeShadows(enabled) {
    this.renderer.shadowMap.enabled = enabled
    if (enabled) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
  }

  setFog(scene, enabled, near, far) {
    if (enabled) {
      scene.fog = new THREE.Fog(scene.background, near, far)
    } else {
      scene.fog = null
    }
  }

  static createInstancedMesh(meshes, count) {
    if (meshes.length === 0) return null

    const referenceMesh = meshes[0]
    const instancedMesh = new THREE.InstancedMesh(
      referenceMesh.geometry,
      referenceMesh.material,
      count
    )

    const dummy = new THREE.Object3D()
    for (let i = 0; i < Math.min(count, meshes.length); i++) {
      const mesh = meshes[i]
      dummy.position.copy(mesh.position)
      dummy.rotation.copy(mesh.rotation)
      dummy.scale.copy(mesh.scale)
      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i, dummy.matrix)
    }

    instancedMesh.instanceMatrix.needsUpdate = true
    return instancedMesh
  }

  static simplifyGeometry(geometry, ratio = 0.5) {
    return geometry
  }

  dispose() {
  }
}
