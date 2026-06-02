export class LotDivider {
  constructor(options) {
    this.size = options.size || 200
    this.splitDepth = options.splitDepth || 3
    this.mainRoadWidth = options.mainRoadWidth || 8
    this.secondaryRoadWidth = options.secondaryRoadWidth || 5
    this.lots = []
  }

  divide() {
    this.lots = []
    const halfSize = this.size / 2
    
    const initialLot = {
      x: -halfSize,
      z: -halfSize,
      width: this.size,
      depth: this.size,
      level: 0,
      type: 'block'
    }

    this.recursiveSplit(initialLot, 0)
    return this.lots
  }

  recursiveSplit(lot, depth) {
    if (depth >= this.splitDepth) {
      this.lots.push(this.createLotWithSetback(lot, depth))
      return
    }

    const roadWidth = depth === 0 ? this.mainRoadWidth : this.secondaryRoadWidth
    const minSize = 15 + depth * 5

    if (lot.width < minSize && lot.depth < minSize) {
      this.lots.push(this.createLotWithSetback(lot, depth))
      return
    }

    const splitAlongWidth = lot.width >= lot.depth && lot.width > minSize
    const splitAlongDepth = lot.depth >= lot.width && lot.depth > minSize

    if (splitAlongWidth) {
      const splitRatio = this.getRandomSplitRatio(depth)
      const splitPoint = lot.width * splitRatio

      const lot1 = {
        x: lot.x,
        z: lot.z,
        width: splitPoint - roadWidth / 2,
        depth: lot.depth,
        level: depth + 1,
        type: 'lot'
      }

      const lot2 = {
        x: lot.x + splitPoint + roadWidth / 2,
        z: lot.z,
        width: lot.width - splitPoint - roadWidth / 2,
        depth: lot.depth,
        level: depth + 1,
        type: 'lot'
      }

      if (lot1.width > minSize / 2) {
        this.recursiveSplit(lot1, depth + 1)
      } else if (lot1.width > 5) {
        this.lots.push(this.createLotWithSetback(lot1, depth + 1))
      }

      if (lot2.width > minSize / 2) {
        this.recursiveSplit(lot2, depth + 1)
      } else if (lot2.width > 5) {
        this.lots.push(this.createLotWithSetback(lot2, depth + 1))
      }
    } else if (splitAlongDepth) {
      const splitRatio = this.getRandomSplitRatio(depth)
      const splitPoint = lot.depth * splitRatio

      const lot1 = {
        x: lot.x,
        z: lot.z,
        width: lot.width,
        depth: splitPoint - roadWidth / 2,
        level: depth + 1,
        type: 'lot'
      }

      const lot2 = {
        x: lot.x,
        z: lot.z + splitPoint + roadWidth / 2,
        width: lot.width,
        depth: lot.depth - splitPoint - roadWidth / 2,
        level: depth + 1,
        type: 'lot'
      }

      if (lot1.depth > minSize / 2) {
        this.recursiveSplit(lot1, depth + 1)
      } else if (lot1.depth > 5) {
        this.lots.push(this.createLotWithSetback(lot1, depth + 1))
      }

      if (lot2.depth > minSize / 2) {
        this.recursiveSplit(lot2, depth + 1)
      } else if (lot2.depth > 5) {
        this.lots.push(this.createLotWithSetback(lot2, depth + 1))
      }
    } else {
      this.lots.push(this.createLotWithSetback(lot, depth))
    }
  }

  createLotWithSetback(lot, depth) {
    const baseSetback = 1.5
    const levelBonus = depth * 0.3
    const setback = Math.min(baseSetback + levelBonus, 3)
    
    return {
      ...lot,
      setback: setback,
      area: lot.width * lot.depth
    }
  }

  getRandomSplitRatio(depth) {
    const baseRatio = 0.5
    const variance = Math.max(0.15, 0.3 - depth * 0.05)
    return baseRatio + (Math.random() - 0.5) * variance * 2
  }

  getLots() {
    return this.lots
  }

  getRoadSegments() {
    const segments = []
    const halfSize = this.size / 2

    const addRoad = (x, z, width, depth, isMain) => {
      segments.push({
        x: x - halfSize,
        z: z - halfSize,
        width,
        depth,
        isMain
      })
    }

    for (let depth = 0; depth < this.splitDepth; depth++) {
      const divisions = Math.pow(2, depth)
      const roadWidth = depth === 0 ? this.mainRoadWidth : this.secondaryRoadWidth

      for (let i = 1; i < divisions; i++) {
        const pos = (i / divisions) * this.size

        addRoad(pos - roadWidth / 2, 0, roadWidth, this.size, depth === 0)

        addRoad(0, pos - roadWidth / 2, this.size, roadWidth, depth === 0)
      }
    }

    return segments
  }
}
