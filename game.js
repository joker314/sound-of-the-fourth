// console.log = () => {}

class Matrix {
    constructor (rowVectors) {
        this.rowVectors = rowVectors
        console.assert(rowVectors.every(row => row.length === rowVectors[0].length))
    }

    negate () {
        return new Matrix(this.rowVectors.map(row => row.negate()))
    }

    transformHighDimensionalVector(vector) {
        console.assert(this.rowVectors[0].length === vector.length)

        return new HighDimensionalVector(this.rowVectors.map(row => row.dot(vector)))
    }

    static identityMatrix(dimension) {
        return new Matrix(
            Array(dimension).fill().map((_, i) => HighDimensionalVector.nthBasisVector(i, dimension))
        )
    }

    /**
     * Given exactly two of the dimensions, gives you a rotation matrix that only affects vectors with components
     * in those two directions. For example, if you pick the "up" and "right" dimensions then you will get roll (since
     * roll does not affect "forward")
     */
    static planarRotationMatrix(i, j, dimension, angle) {
        const [c, s] = [Math.cos(angle), Math.sin(angle)] 
        
        const matrix = Matrix.identityMatrix(dimension)
        matrix.rowVectors[i].components[i] = c
        matrix.rowVectors[i].components[j] = -s
        matrix.rowVectors[j].components[j] = c
        matrix.rowVectors[j].components[i] = s

        return matrix
    }
}

class HighDimensionalVector {
    constructor (components) {
        this.components = components
    }

    /**
     * Returns a unit vector with exactly one component equal to 1, like this: [0, 0, 1, 0, 0, 0, 0]
     * 
     * @param {number} n 
     * @param {number} dimension 
     * @returns 
     */
    static nthBasisVector(n, dimension) {
        const components = Array(dimension).fill(0)
        components[n] = 1

        return new HighDimensionalVector(components)
    }

    [Symbol.iterator]() {
        return this.components[Symbol.iterator]();
    }

    norm() {
        return Math.sqrt(this.components.reduce((acc, v) => acc + v * v, 0));
    }

    dot(otherVector) {
        return this.components.reduce((acc, v, i) => acc + v * otherVector.components[i], 0)
    }

    add(otherVector) {
        return new HighDimensionalVector(this.components.map((v, i) => v + otherVector.components[i]));
    }

    normalize() {
        const norm = this.norm();
        if (norm === 0) {
            return this
        }

        return new HighDimensionalVector(this.components.map(v => v / norm))
    }

    scale(factor) {
        return new HighDimensionalVector(this.components.map(v => v * factor)) 
    }

    negate() {
        return this.scale(-1);
    }

    get x() { return this.components[0] }
    get y() { return this.components[1] }
    get z() { return this.components[2] }
    get w() { return this.components[3] }
}

class HighDimensionalRay {
    constructor (positionVector, unitVector) {
        this.positionVector = positionVector
        this.unitVector = unitVector
    }

    // Leaving this here for now just to help draw the "from above" projection in the first canvas
    getPhi() {
        return Math.atan2(this.unitVector.y, this.unitVector.x)
    }

    findFirstShape(shapes) {
        const firstShape = shapes.toSorted((a, b) => {
            const aDistance = a.distanceAlongRay(this)
            const bDistance = b.distanceAlongRay(this)

            if (aDistance < 0 || aDistance === Infinity) {
                return 1
            }

            if (bDistance < 0 || bDistance === Infinity) {
                return -1
            }

            return aDistance - bDistance 
        })[0]

        const firstShapeDistance = firstShape.distanceAlongRay(this)

        if (firstShapeDistance < 0 || firstShapeDistance === Infinity) {
            return null
        }

        return firstShape
    }
}
function xoshiro128ss(a, b, c, d) {
    return function() {
        let t = b << 9, r = b * 5;
        r = (r << 7 | r >>> 25) * 9;
        c ^= a;
        d ^= b;
        b ^= c;
        a ^= d;
        c ^= t;
        d = d << 11 | d >>> 21;
        return (r >>> 0) / 4294967296;
    }
}

const seedgen = () => (Math.random()*2**32)>>>0;
const seededRandom = xoshiro128ss(3930871319, 2219299714, 591391995, 1572269650);

class Sphere {
    constructor (positionVector, radius) {
        this.positionVector = positionVector
        this.radius = radius
        this.color2 = seededRandom() * 100;
    }

    render2D (ctx) {
        ctx.beginPath()
        ctx.strokeStyle = this.color
        ctx.arc(this.positionVector.x, this.positionVector.y, this.radius, 0, 2 * Math.PI)
        ctx.stroke()
    }

    distanceAlongRay(highDimensionalRay) {
        const oMinusC = this.positionVector.add(highDimensionalRay.positionVector.negate()).negate()
        const rayUnit = highDimensionalRay.unitVector

        const directionDotCentre = rayUnit.dot(oMinusC)

        // `delta` is a discriminant which tells you how many intersection points there are (0, 1, 2) indicated by
        // being negative/zero/positive
        const delta = directionDotCentre ** 2 - (oMinusC.norm() ** 2 - this.radius ** 2)

        if (delta < 0) {
            // No intersection points
            return Infinity
        }

        const sqrtDelta = Math.sqrt(delta)
        
        const possibleDistancesUnfiltered = [
            -directionDotCentre + sqrtDelta,
            -directionDotCentre - sqrtDelta
        ]
        
        const possibleDistances = possibleDistancesUnfiltered.filter(distance => distance >= 0)

        possibleDistances.sort((a, b) => a - b)

        if (possibleDistances.length === 0) {
            // Sphere is "behind" us
            return Infinity
        }

        return possibleDistances[0]
    }
}

class AxisAlignedHypercube {
    constructor (position, dimensions) {
        this.position = position
        this.dimensions = dimensions
        this.color = "black"
    }

    render2D(ctx) {
        ctx.beginPath()
        ctx.strokeStyle = this.color
        ctx.rect(this.position.x, this.position.y, this.dimensions[0], this.dimensions[1])
        ctx.stroke()
    }

    containsPoint(p) {
        for (let i = 0; i < this.dimensions.length; i++) {
            if (p.components[i] < this.position.components[i]) {
                return false;
            }

            if (p.components[i] > this.position.components[i] + this.dimensions[i]) {
                return false;
            }
        }

        return true;
    }

    distanceAlongRay(highDimensionalRay) {
        // The ray is only inside the hypercube in the interval [tMin, tMax]
        let tMin = -Infinity
        let tMax = Infinity

        for (let i = 0; i < this.dimensions.length; i++) {
            const rayOrigin = highDimensionalRay.positionVector.components[i]
            const rayDirection = highDimensionalRay.unitVector.components[i]
            const [lowBound, highBound] = [this.position.components[i], this.position.components[i] + this.dimensions[i]]

            if (rayDirection === 0) {
                if (rayOrigin < lowBound || rayOrigin > highBound) {
                    return Infinity
                }
            } else {
                const entryAndExit = [
                    (lowBound - rayOrigin) / rayDirection,
                    (highBound - rayOrigin) / rayDirection
                ]

                entryAndExit.sort((a, b) => a - b)
                
                tMin = Math.max(tMin, entryAndExit[0])
                tMax = Math.min(tMax, entryAndExit[1])
            }
        }

        if (tMin > tMax) {
            return Infinity 
        }

        if (tMin >= 0) {
            return tMin
        }

        // Adding this because I think it should help in the case where we're inside the hypercube
        if (tMax >= 0) {
            return tMax
        }

        return -Infinity
    }
}

class Player {
    constructor (position, dimension) {
        this.position = position
        this.dimension = dimension

        if (dimension < 3) {
            throw new Error("Need at least 3D to have a 'forward', 'right', and 'up' vector for the 2D raytracing")
        }
        
        // Pick an arbitrary orthonormal basis
        this.basis = Array(dimension).fill().map((_, i) => HighDimensionalVector.nthBasisVector(i, dimension))
    }

    get forward() {
        return this.basis[0]
    }

    get right() {
        return this.basis[1]
    }

    get up() {
        return this.basis[2]
    }

    get ana() {
        return this.basis[3]
    }

    updateBasisByMatrix(matrix) {
        this.basis = this.basis.map(basisVector => matrix.transformHighDimensionalVector(basisVector))
    }

    look(maze) {
        for (let shape of maze.shapes) {
            shape.color = "black"
        }

        const ray = new HighDimensionalRay(this.position, this.forward)
        const closestShape = ray.findFirstShape(maze.shapes)

        if (closestShape) {
            closestShape.color = "blue"
        }
    }

    rayTrace(maze, output, gains) {
        output.clearRect(0, 0, output.canvas.width, output.canvas.height);
    
        // Use a finer resolution
        const horizontalResolution = 10;
        const verticalResolution = 10;
    
        // Use a narrower field of view (e.g., 60 degrees instead of 90)
        const fieldOfView = Math.PI / 3;  // 60° vertical FOV
        const aspect = output.canvas.width / output.canvas.height;
        const halfFov = fieldOfView / 2;
        const halfHeight = Math.tan(halfFov);
        const halfWidth = aspect * halfHeight;
    
        // Cast rays for each block on the screen
        for (let i = 0; i < output.canvas.width; i += horizontalResolution) {
            for (let j = 0; j < output.canvas.height; j += verticalResolution) {
                // Compute normalized device coordinates [-1, 1]
                const u = ((i + horizontalResolution / 2) / output.canvas.width) * 2 - 1;
                const v = 1 - ((j + verticalResolution / 2) / output.canvas.height) * 2;
    
                // Scale these by the image plane dimensions
                const uScaled = u * halfWidth;
                const vScaled = v * halfHeight;
    
                // Compute the ray direction using the camera basis
                const rayDir = this.forward
                    .add(this.right.scale(uScaled))
                    .add(this.up.scale(vScaled))
                    .normalize();
    
                const ray = new HighDimensionalRay(this.position, rayDir);
                const closestShape = ray.findFirstShape(maze.shapes);
    
                if (closestShape) {
                    const distance = closestShape.distanceAlongRay(ray);
                    const brightness = Math.max(0, Math.min(255, Math.floor(255 - distance * 0.5)));
                    output.fillStyle = `rgb(${brightness}, 0, ${brightness})`;

                    // const distance = closestShape.distanceAlongRay(ray);
                    // // const brightness = Math.max(0, Math.min(255, Math.floor(255 - distance * 0.5)));
                    // // const v = (100/distance) * 100;
                    // const v = 100 - distance * 0.5/255*100
                    // const clamp = (v, min, max) => Math.max(max, Math.min(min, v));
                    // const brightness = clamp(0, 100, v);
                    
                    // // output.fillStyle = `rgb(${brightness}, ${closestShape.color2}, ${brightness})`;
                    // output.fillStyle = `hsl(${closestShape.color2}, 50%, ${brightness}%)`;
                } else {
                    output.fillStyle = "black";
                }
                output.fillRect(i, j, horizontalResolution, verticalResolution);
            }
        }
    }
}


class Maze {
    constructor (shapes) {
        this.shapes = shapes 
    }
}

const maze = new Maze([
    new AxisAlignedHypercube(new HighDimensionalVector([50, 50, 0, 0]), [50, 50, 50, 50]),
    new Sphere(new HighDimensionalVector([400, 100, 0, 0]), 50),
    new Sphere(new HighDimensionalVector([400, 300, 0, 0]), 80),
    new Sphere(new HighDimensionalVector([400, 300, 100, 0]), 80),
])

function renderMaze2D(ctx, maze, player) {
    const mapUp = HighDimensionalVector.nthBasisVector(1, 4)
    const mapRight = HighDimensionalVector.nthBasisVector(0, 4)

    const phi = Math.atan2(player.forward.dot(mapUp), player.forward.dot(mapRight))

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Render the player
    ctx.beginPath()
    ctx.strokeStyle = "red"
    ctx.arc(player.position.x, player.position.y, 20, phi - Math.PI / 4, phi + Math.PI / 4)
    ctx.stroke()

    // Recolour the obstacles
    player.look(maze)

    // Render the obstacles 
    // TODO: this logic should be part of each shape
    for (let shape of maze.shapes) {
        shape.render2D(ctx)
    }
}

const topProjectionCanvas = document.querySelector("#top")
const topProjection = topProjectionCanvas.getContext("2d")

const outputCanvas = document.querySelector("#raytraced")
const output = outputCanvas.getContext("2d")

const player = new Player(new HighDimensionalVector([200, 200, 0, 0]), 4)

const audioContext = new AudioContext()
const minFrequency = 100
const maxFrequency = 10000

const oscillators = []
const gains = []

for (let i = 0; i < outputCanvas.width; i++) {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    gain.connect(audioContext.destination)
    oscillator.connect(gain)

    gain.gain.value = 0

    oscillator.type = "sine"
    oscillator.frequency.value = Math.exp(Math.log(minFrequency) + i * (Math.log(maxFrequency) - Math.log(minFrequency)) / outputCanvas.width)
//        oscillator.frequency.value = minFrequency + i * (maxFrequency - minFrequency) / outputCanvas.width
    oscillator.start()

    gains.push(gain)
    oscillators.push(oscillator)
}

renderMaze2D(topProjection, maze, player)

window.addEventListener("click", () => audioContext.resume())

/**
 * Returns a lookup table which maps a key code to a handler function 
 * 
 * @param {*} translationKeyPairs 
 * @param {*} rotationKeyPairs 
 */
function createKeyBindingTable(translationKeyPairs, rotationKeyPairs, player) {
    const lookupTable = {}
    const TRANSLATION_STEP = 5
    const ROTATION_STEP = 0.1

    translationKeyPairs.forEach(([backKey, frontKey], i) => {
        lookupTable[backKey] = () => {
            player.position = player.position.add(player.basis[i].scale(-1 * TRANSLATION_STEP))
            document.querySelector("#hint").textContent = `You're moving ${dimensionInverses[i]} (without rotating), which you can undo by moving ${dimensionDescriptions[i]} using key ${frontKey}`
        }
        lookupTable[frontKey] = () => {
            player.position = player.position.add(player.basis[i].scale(TRANSLATION_STEP))
            document.querySelector("#hint").textContent = `You're moving ${dimensionDescriptions[i]} (without rotating), which you can undo by moving ${dimensionInverses[i]} using key ${backKey}`
        }
    })

    let counter = 0
    for (let j = 0; j < player.dimension; j++) {
        for (let i = 0; i < j; i++, counter++) {
            if (counter >= rotationKeyPairs.length) {
                throw new Error("Not enough rotations described for the given dimension")
            }

            const [leftKey, rightKey] = rotationKeyPairs[counter]

            const leftMatrix = Matrix.planarRotationMatrix(i, j, player.dimension, -ROTATION_STEP)
            const rightMatrix = Matrix.planarRotationMatrix(i, j, player.dimension, ROTATION_STEP)

            lookupTable[leftKey] = () => {
                player.updateBasisByMatrix(leftMatrix);
                document.querySelector("#hint").textContent = `You're rotating - changing what it would mean to move '${dimensionDescriptions[i]}' or '${dimensionDescriptions[j]}' (without changing your position, or the directions of the other axes). You can undo this rotation using ${rightKey}`
            }
            lookupTable[rightKey] = () => {
                player.updateBasisByMatrix(rightMatrix);
                document.querySelector("#hint").textContent = `You're rotating - changing what it would mean to move '${dimensionDescriptions[i]}' or '${dimensionDescriptions[j]}' (without changing your position, or the directions of the other axes). You can undo this rotation using ${leftKey}`
            }
        }
    }

    return lookupTable
}

const dimensionDescriptions = ["forwards", "right", "up", "ana"]
const dimensionInverses = ["backwards", "left", "down", "kata"]

const table = createKeyBindingTable(
    // Translations (in the same order as `dimensionDescriptions`)
    [
        ["ArrowDown", "ArrowUp"],
        ["KeyO", "KeyP"],
        ["KeyU", "KeyI"],
        ["KeyA", "KeyS"]
    ],
    // Rotations
    [
        ["ArrowLeft", "ArrowRight"],
        ["KeyN", "KeyM"],
        ["KeyV", "KeyB"],
        ["KeyD", "KeyF"],
        ["KeyG", "KeyH"],
        ["KeyJ", "KeyK"]
    ],
    player
)

window.addEventListener("keydown", (e) => {
    if (table[e.code]) {
        table[e.code]()
    }

    renderMaze2D(topProjection, maze, player)
    player.rayTrace(maze, output, gains)
})