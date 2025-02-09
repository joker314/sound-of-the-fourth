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

    static pitchMatrix(angle) {
        return Matrix.planarRotationMatrix(0, 2, 4, -angle)
    }

    static rollMatrix(angle) {
        return Matrix.planarRotationMatrix(1, 2, 4, angle)
    }

    static yawMatrix(angle) {
        return Matrix.planarRotationMatrix(0, 1, 4, angle)
    }

    static AMatrix(angle) {
        return Matrix.planarRotationMatrix(0, 3, 4, angle)
    }

    static BMatrix(angle) {
        return Matrix.planarRotationMatrix(1, 3, 4, angle)
    }

    static CMatrix(angle) {
        return Matrix.planarRotationMatrix(2, 3, 4, angle)
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

class Vector3d {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    [Symbol.iterator]() {
        return [this.x, this.y, this.z][Symbol.iterator]();
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    dot(otherVector) {
        const [otherX, otherY, otherZ] = otherVector;
        return this.x * otherX + this.y * otherY + this.z * otherZ;
    }

    translate(translationVector) {
        const [deltaX, deltaY, deltaZ] = translationVector;
        return new Vector3d(this.x + deltaX, this.y + deltaY, this.z + deltaZ);
    }

    moveInDirection(distance, phi, theta) {
        const unitDir = Vector3d.ofUnitDirection(theta, phi);
        return this.translate(unitDir.scale(distance));
    }

    scale(factor) {
        return new Vector3d(this.x * factor, this.y * factor, this.z * factor);
    }

    negate() {
        return this.scale(-1);
    }

    // --- NEW HELPER METHODS ---
    add(other) {
        return new Vector3d(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    cross(other) {
        return new Vector3d(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vector3d(0, 0, 0);
        return new Vector3d(this.x / len, this.y / len, this.z / len);
    }
    // ----------------------------

    static ofUnitDirection(theta, phi) {
        return new Vector3d(
            Math.sin(theta) * Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta)
        );
    }
}


class Point {
    constructor (x, y) {
        this.x = x
        this.y = y
    }

    [Symbol.iterator]() {
        return [this.x, this.y][Symbol.iterator]()
    }

    translate(offset) {
        const [deltaX, deltaY] = offset
        return new Point(this.x + deltaX, this.y + deltaY)
    }

    moveInDirection(distance, direction) {
        console.log("using the old move in direction")
        return new Point(this.x + distance * Math.cos(direction), this.y + distance * Math.sin(direction))
    }

    scale(factor) {
       return new Point(this.x * factor, this.y * factor)
    }

    negate() {
        return this.scale(-1)
    }
}

class Wall {
    constructor(startPoint, endPoint) {
        this.startPoint = startPoint
        this.endPoint = endPoint
        this.color = "black"
    }

    gradient () {
        return (this.endPoint.y - this.startPoint.y) / (this.endPoint.x - this.startPoint.x)
    }

    /**
     * The x-coordinate where the (infinite extension in both directions) of the wall intersects the x-axis
     */
    xIntercept () {
        // console.log("calculating gradient of", this, "by", this.startPoint.y, this.startPoint.x, this.gradient())
        return this.startPoint.y - this.startPoint.x * this.gradient()
    }

    translate(offset) {
        return new Wall(this.startPoint.translate(offset), this.endPoint.translate(offset))
    }

    /**
     * Calculates how far the ray travels before it collides with this wall. Returns Infinity if
     * the ray doesn't intersect with the wall at all
     * 
     * @param {Ray} ray 
     */
    distanceAlongRay(ray) {
        // Translate everything so that the ray starts at the origin
        const offset = ray.startPoint.negate()
        const tRay = ray.translate(offset)
        const tWall = this.translate(offset)

        let xCoordOfIntersection = null
        let yCoordOfIntersection = null
        let sign = null

        if (Math.abs(tWall.gradient()) !== Infinity) {
            xCoordOfIntersection = tWall.xIntercept() / (tRay.gradient - tWall.gradient())

            if (xCoordOfIntersection < Math.min(tWall.startPoint.x, tWall.endPoint.x)) {
                return Infinity
            }

            if (xCoordOfIntersection > Math.max(tWall.startPoint.x, tWall.endPoint.x)) {
                return Infinity
            }

            yCoordOfIntersection = tRay.gradient * xCoordOfIntersection
        } else {
            xCoordOfIntersection = tWall.startPoint.x 
            yCoordOfIntersection = tRay.gradient * xCoordOfIntersection

            if (yCoordOfIntersection < Math.min(tWall.startPoint.y, tWall.endPoint.y)) {
                return Infinity
            }

            if (yCoordOfIntersection > Math.max(tWall.startPoint.y, tWall.endPoint.y)) {
                return Infinity
            }
        }

        const intersectionPointAngle = Math.atan2(yCoordOfIntersection, xCoordOfIntersection)
        const angleDifference = Math.abs(intersectionPointAngle - tRay.direction)

        const epsilon = 0.2 
        if ((angleDifference + epsilon) % (2 * Math.PI) <= 3 * epsilon) {
            sign = 1 
        } else {
            sign = -1
        }

        return sign * Math.sqrt(xCoordOfIntersection * xCoordOfIntersection + yCoordOfIntersection * yCoordOfIntersection)
    }
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

    findFirstWall(walls) {
        const firstWall = walls.toSorted((a, b) => {
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

        const firstWallDistance = firstWall.distanceAlongRay(this)

        if (firstWallDistance < 0 || firstWallDistance === Infinity) {
            return null
        }

        return firstWall
    }
}

class Wall3d {
    constructor (underlyingWall) {
        this.underlyingWall = underlyingWall
        this.startPoint = this.underlyingWall.startPoint
        this.endPoint = this.underlyingWall.endPoint
    }

    distanceAlongRay(ray) {
        const angle = ray.getPhi()
        const ray2d = new Ray(ray.positionVector, angle)

        // TODO: use ray.getTheta() to ensure walls aren't infinitely high 
        return this.underlyingWall.distanceAlongRay(ray2d)
    }
}

class Sphere {
    constructor (positionVector, radius) {
        this.positionVector = positionVector
        this.radius = radius
    }

    distanceAlongRay(highDimensionalRay) {
        const oMinusC = this.positionVector.add(highDimensionalRay.positionVector.negate()).negate()
        const rayUnit = highDimensionalRay.unitVector

        const directionDotCentre = rayUnit.dot(oMinusC)

        // `delta` is a discriminant which tells you how many intersection points there are (0, 1, 2) indicated by
        // being negative/zero/positive
        const delta = directionDotCentre ** 2 - (oMinusC.norm() ** 2 - this.radius ** 2)

        if (delta < 0) {
            // console.log("Returning infinity due to negative delta")
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
            // console.log("Returning infinity due to no good candidates")
            return Infinity
        }

        return possibleDistances[0]
    }
}

class Ray {
    constructor(startPoint, direction) {
        this.startPoint = startPoint
        this.direction = direction
        this.gradient = Math.tan(direction)
    }

    translate(offset) {
        return new Ray(this.startPoint.add(offset), this.direction)
    }

    findFirstWall(walls) {
        const firstWall = walls.toSorted((a, b) => {
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

        const firstWallDistance = firstWall.distanceAlongRay(this)

        if (firstWallDistance < 0 || firstWallDistance === Infinity) {
            return null
        }

        return firstWall
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
        for (let wall of maze.walls) {
            wall.color = "black"
        }

        const ray = new HighDimensionalRay(this.position, this.forward)
        const closestWall = ray.findFirstWall(maze.walls)

        if (closestWall) {
            closestWall.color = "blue"
        }

        // console.log("Distances are", maze.walls.map(shape => shape.distanceAlongRay(ray)))
    }

    rayTrace4d(maze, output, gains) {
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
    
        // Compute camera basis vectors
        // let right = forward.cross(worldUp).normalize();
        // if (right.length() === 0) {
        //     right = new Vector3d(1, 0, 0);
        // }
        // const up = right.cross(forward).normalize();
        // console.log(up)

        // const up = Vector3d.ofUnitDirection(this.theta, this.direction).normalize();
        // console.log(forward)
    
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
                const closestWall = ray.findFirstWall(maze.walls);
    
                if (closestWall) {
                    const distance = closestWall.distanceAlongRay(ray);
                    const brightness = Math.max(0, Math.min(255, Math.floor(255 - distance * 0.5)));
                    output.fillStyle = `rgb(${brightness}, 0, ${brightness})`;
                } else {
                    output.fillStyle = "black";
                }
                output.fillRect(i, j, horizontalResolution, verticalResolution);
            }
        }
    }
    
    
    // (Other methods remain the same …)
}


class Maze {
    constructor (walls) {
        this.walls = walls
    }
}

const maze = new Maze([
    new Wall3d(new Wall(new Point(10, 10), new Point(10, 100))),
    new Wall3d(new Wall(new Point(50, 10), new Point(50, 100))),
    new Wall3d(new Wall(new Point(10, 10), new Point(50, 10))),
    new Sphere(new HighDimensionalVector([400, 100, 0, 0]), 50),
    new Sphere(new HighDimensionalVector([400, 300, 0, 0]), 80),
])

function renderMaze2D(ctx, maze, player) {
    const mapUp = HighDimensionalVector.nthBasisVector(1, 4)
    const mapRight = HighDimensionalVector.nthBasisVector(0, 4)

    const phi = Math.atan2(player.forward.dot(mapUp), player.forward.dot(mapRight))

    // console.log("components", ...player.forward.components, "/", ...mapUp.components, "/", ...mapRight.components, "/", player.forward.dot(mapUp), player.forward.dot(mapRight))

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Render the player
    ctx.beginPath()
    ctx.strokeStyle = "red"
    ctx.arc(player.position.x, player.position.y, 20, phi - Math.PI / 4, phi + Math.PI / 4)
    ctx.stroke()

    // Recolour the walls
    player.look(maze)

    // Render the walls
    // TODO: this logic should be part of each shape
    for (let shape of maze.walls) {
        if (shape instanceof Wall3d) {
            ctx.beginPath()
            ctx.strokeStyle = shape.color
            ctx.moveTo(...shape.startPoint)
            ctx.lineTo(...shape.endPoint)
            ctx.stroke()
        }

        if (shape instanceof Sphere) {
            ctx.beginPath()
            ctx.strokeStyle = shape.color
            ctx.arc(shape.positionVector.x, shape.positionVector.y, shape.radius, 0, 2 * Math.PI)
            ctx.stroke()
        }
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
        const frontVector = player.basis[i].scale(TRANSLATION_STEP)
        const backVector = frontVector.negate()

        lookupTable[backKey] = () => {
            player.position = player.position.add(backVector)
            document.querySelector("#hint").textContent = `You're moving ${dimensionInverses[i]} (without rotating), which you can undo by moving ${dimensionDescriptions[i]} using key ${frontKey}`
        }
        lookupTable[frontKey] = () => {
            player.position = player.position.add(frontVector)
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
    player.rayTrace4d(maze, output, gains)
})