// console.log = () => {}

class Matrix {
    constructor (rowVectors) {
        this.rowVectors = rowVectors
        console.assert(rowVectors.every(row => row.length === rowVectors[0].length))
    }

    
    get toString() {
        const rows = this.rowVectors.map(row => 
            '[' + row.components.map(n => n.toFixed(4).padStart(8)).join(' ') + ']'
        );
        return '[\n  ' + rows.join('\n') + '\n]';
    }

    negate () {
        return new Matrix(this.rowVectors.map(row => row.negate()))
    }

    transpose() {
        const numRows = this.rowVectors.length;
        const numCols = this.rowVectors[0].components.length;
        
        // Create new array of vectors for transposed matrix
        const transposedRows = Array(numCols).fill().map(() => Array(numRows).fill(0));
        
        // Fill in transposed values
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                transposedRows[j][i] = this.rowVectors[i].components[j];
            }
        }

        // Convert arrays to HighDimensionalVectors
        return new Matrix(transposedRows.map(row => new HighDimensionalVector(row)));
    }

    inverse() {
        const n = this.rowVectors.length;
        
        // Create augmented matrix [A|I]
        const augmented = new Array(n).fill().map(() => new Array(2 * n).fill(0));
        
        // Fill left side with original matrix
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                augmented[i][j] = this.rowVectors[i].components[j];
            }
        }
        
        // Fill right side with identity matrix
        for (let i = 0; i < n; i++) {
            augmented[i][i + n] = 1;
        }

        // Gaussian elimination
        for (let i = 0; i < n; i++) {
            // Find pivot
            let pivot = augmented[i][i];
            let pivotRow = i;
            
            // Find largest pivot in column
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(augmented[j][i]) > Math.abs(pivot)) {
                    pivot = augmented[j][i];
                    pivotRow = j;
                }
            }

            if (Math.abs(pivot) < 1e-10) {
                throw new Error("Matrix is not invertible");
            }

            // Swap rows if needed
            if (pivotRow !== i) {
                [augmented[i], augmented[pivotRow]] = [augmented[pivotRow], augmented[i]];
            }

            // Scale row to make pivot 1
            const scale = 1 / augmented[i][i];
            for (let j = 0; j < 2 * n; j++) {
                augmented[i][j] *= scale;
            }

            // Eliminate column
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    const factor = augmented[j][i];
                    for (let k = 0; k < 2 * n; k++) {
                        augmented[j][k] -= factor * augmented[i][k];
                    }
                }
            }
        }

        // Extract right half (inverse matrix)
        const inverse = new Array(n).fill().map(() => new Array(n));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                inverse[i][j] = augmented[i][j + n];
            }
        }

        return new Matrix(inverse.map(row => new HighDimensionalVector(row)));
    }

    transformHighDimensionalVector(vector) {
        console.assert(this.rowVectors[0].components.length === vector.components.length)

        return new HighDimensionalVector(this.rowVectors.map(row => row.dot(vector)))
    }

    matmul(matrix) {
        // Check dimensions match for matrix multiplication
        console.assert(this.rowVectors[0].components.length === matrix.rowVectors.length)

        // For each row in this matrix, multiply by each column in other matrix
        const resultRows = this.rowVectors.map(row => {
            // For each column in other matrix
            const newComponents = Array(matrix.rowVectors[0].components.length).fill(0)
            for (let j = 0; j < matrix.rowVectors[0].components.length; j++) {
                // Dot product of row with jth column of other matrix
                newComponents[j] = matrix.rowVectors.reduce((sum, otherRow, k) => {
                    return sum + row.components[k] * otherRow.components[j]
                }, 0)
            }
            return new HighDimensionalVector(newComponents)
        })

        return new Matrix(resultRows)
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
        this.color2 = seededRandom();
        this.removed = false
    }

    getNormalAt(point) {
        // (point - center) normalized
        return point.add(this.positionVector.negate()).normalize();
    }

    getCentre() {
        if (this.removed) {
            return null
        }

        return this.positionVector
    }

    getDistanceToBoundary(positionVector) {
        if (this.removed) {
            return Infinity
        }

        return Math.abs(positionVector.add(this.positionVector.negate()).norm() - this.radius)
    }

    containsPoint(positionVector) {
        if (this.removed) {
            return false
        }

        return positionVector.add(this.positionVector.negate()).norm() <= this.radius
    }

    projectOntoAxisAlignedPlane (ctx, firstAxis, secondAxis) {
        if (this.removed) {
            return
        }

        ctx.beginPath()
        ctx.strokeStyle = this.color
        ctx.arc(
            this.positionVector.components[firstAxis],
            this.positionVector.components[secondAxis],
            this.radius,
            0,
            2 * Math.PI
        )
        ctx.stroke()
    }

    distanceAlongRay(highDimensionalRay) {
        if (this.removed) {
            return Infinity
        }

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

    remove () {
        this.removed = true
    }
}

class AxisAlignedHypercube {
    constructor (position, dimensions) {
        this.position = position
        this.dimensions = dimensions
        this.color = "black"
        this.color2 = seededRandom();
        this.removed = false
    }

    getNormalAt(point) {
        const epsilon = 0.001;
        // Create an array for the normal components.
        const normalComponents = Array(this.dimensions.length).fill(0);
        for (let i = 0; i < this.dimensions.length; i++) {
            const lower = this.position.components[i];
            const upper = this.position.components[i] + this.dimensions[i];
            if (Math.abs(point.components[i] - lower) < epsilon) {
                normalComponents[i] = -1;
                break;  // assume only one face is hit
            } else if (Math.abs(point.components[i] - upper) < epsilon) {
                normalComponents[i] = 1;
                break;
            }
        }
        return new HighDimensionalVector(normalComponents).normalize();
    }

    getCentre () {
        if (this.removed) {
            return null
        }

        return this.position.add(
            new HighDimensionalVector(dimensions.map(dimension => dimension / 2))
        )
    }

    getDistanceToBoundary (positionVector) {
        if (this.removed) {
            return Infinity
        }

        const closestPointToHypercubeBoundary = new HighDimensionalVector(
            Array(this.dimensions.length).fill().map((_, i) => {
                const [lowBound, highBound] = [this.position.components[i], this.position.components[i] + this.dimensions[i]]
                return Math.max(lowBound, Math.min(positionVector.components[i], highBound))
            })
        )

        return closestPointToHypercubeBoundary.add(positionVector.negate()).norm()
    }

    projectOntoAxisAlignedPlane(ctx, firstAxis, secondAxis) {
        if (this.removed) {
            return
        }

        ctx.beginPath()
        ctx.strokeStyle = this.color
        ctx.rect(this.position.components[firstAxis], this.position.components[secondAxis], this.dimensions[0], this.dimensions[1])
        ctx.stroke()
    }

    containsPoint(p) {
        if (this.removed) {
            return false
        }

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
        if (this.removed) {
            return Infinity
        }

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

    remove () {
        this.removed = true
    }
}

class Player {
    constructor (position, dimension) {
        this.position = position
        this.dimension = dimension
        this.score = 500

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
        this.basis = matrix.matmul(new Matrix(this.basis)).rowVectors;
    }

    /*
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
    */

    rayTrace(maze, output, gains) {
        output.clearRect(0, 0, output.canvas.width, output.canvas.height);
    
        for (let shape of maze.shapes) {
            shape.color = "black"
        }
    
        const horizontalResolution = 10;
        const verticalResolution = 10;
        const fieldOfView = Math.PI / 3;  // 60° vertical FOV
        const aspect = output.canvas.width / output.canvas.height;
        const halfFov = fieldOfView / 2;
        const halfHeight = Math.tan(halfFov);
        const halfWidth = aspect * halfHeight;
    
        for (let i = 0; i < output.canvas.width; i += horizontalResolution) {
            for (let j = 0; j < output.canvas.height; j += verticalResolution) {
                const u = ((i + horizontalResolution / 2) / output.canvas.width) * 2 - 1;
                const v = 1 - ((j + verticalResolution / 2) / output.canvas.height) * 2;
                const uScaled = u * halfWidth;
                const vScaled = v * halfHeight;
                const rayDir = this.forward
                    .add(this.right.scale(uScaled))
                    .add(this.up.scale(vScaled))
                    .normalize();
    
                const ray = new HighDimensionalRay(this.position, rayDir);
                const closestShape = ray.findFirstShape(maze.shapes);
                if (closestShape) {
                    const distance = closestShape.distanceAlongRay(ray);
                    // Compute the intersection point
                    const intersectionPoint = ray.positionVector.add(ray.unitVector.scale(distance));
                    // Compute the surface normal using the new method
                    const normal = closestShape.getNormalAt(intersectionPoint);
                    
                    const lightDir = new HighDimensionalVector([-1, -3, 2, 4]).normalize();
                    // Lambertian shading: the more the surface faces the light, the brighter it is.
                    const lambert = Math.max(0, normal.dot(lightDir));
                    // Map lambert factor to brightness (e.g., 50%-100% brightness)
                    const brightness = 50 + lambert * 50;
                    
                    // Use the shape’s intrinsic color (e.g. shape.color2 interpreted as a hue) with the computed brightness.
                    output.fillStyle = `hsl(${closestShape.color2 * 360}, 50%, ${brightness}%)`;
    
                    // Optionally update the 2D projection color for debugging:
                    const color2d = closestShape.containsPoint(this.position) ? 0 : 180;
                    closestShape.color = `hsl(${color2d}, 100%, ${Math.max(50, brightness) / 2}%)`;
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

    // TODO: see `imageToAudioDemo.js`, see if we can generalise the smooth-but-sharp falling off so it works for both
    // spheres and hypercubes?
    amplitudeAt (positionVector) {
        let totalContribution = 0
        for (let shape of this.shapes) {
            if (shape.containsPoint(positionVector)) {
                totalContribution += 1
            }
        }

        return totalContribution
    }

    /**
     * Returns `scoreChange`, which should be added to the player's current score
     */
    performCaptureAt(positionVector) {
        const PENALTY = -5
        const REWARD = 20

        let score = 0
        let capturedSuccessfully = false

        for (let shape of this.shapes) {
            if (shape.containsPoint(positionVector)) {
                score += REWARD
                capturedSuccessfully = true
                shape.remove()
            } 
        }

        if (!capturedSuccessfully) {
            return PENALTY
        }

        return score
    }
}

class AxisDescription {
    // e.g. "up", "down", "above", "below"
    constructor (directionName, inverseName, inThatDirection, inThatInverse, color) {
        this.directionName = directionName
        this.inverseName = inverseName
        this.inThatDirection = inThatDirection
        this.inThatInverse
        this.color = color
    }
}

const maze = new Maze([
    new AxisAlignedHypercube(new HighDimensionalVector([50, 50, 0, 0]), [50, 50, 50, 50]),
    new Sphere(new HighDimensionalVector([400, 100, 0, 0]), 50),
    new Sphere(new HighDimensionalVector([400, 300, 0, 0]), 80),
    new Sphere(new HighDimensionalVector([400, 200, 100, 0]), 80),
])

function projectOntoAxisAlignedPlane(ctx, maze, player, firstAxis, secondAxis) {
    const mapRight = HighDimensionalVector.nthBasisVector(firstAxis, 4)
    const mapUp = HighDimensionalVector.nthBasisVector(secondAxis, 4)

    const phi = Math.atan2(player.forward.dot(mapUp), player.forward.dot(mapRight))

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Render the player
    // First, render the dotted arc in front of them that shows their viewing direction
    ctx.beginPath()
    ctx.strokeStyle = "red"
    ctx.setLineDash([2, 5]);
    ctx.arc(
        player.position.components[firstAxis],
        player.position.components[secondAxis],
        20,
        phi - Math.PI / 4,
        phi + Math.PI / 4
    )
    ctx.stroke()
    // Secondly, render the filled circle that shows their exact position
    ctx.beginPath()
    ctx.fillStyle = "red"
    ctx.setLineDash([]);
    ctx.arc(
        player.position.components[firstAxis],
        player.position.components[secondAxis],
        5,
        0,
        2 * Math.PI
    )
    ctx.fill()

    // Recolour the obstacles
    // player.look(maze)

    // Render the obstacles 
    // TODO: this logic should be part of each shape
    for (let shape of maze.shapes) {
        shape.projectOntoAxisAlignedPlane(ctx, firstAxis, secondAxis)
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

projectOntoAxisAlignedPlane(topProjection, maze, player, 0, 1)

window.addEventListener("click", () => audioContext.resume())

const renderKey = keyName => {
    if (keyName.startsWith("Key")) {
        return keyName.substr(3)
    }

    return {
        "ArrowUp": "\u2191",
        "ArrowDown": "\u2193",
        "ArrowLeft": "\u2190",
        "ArrowRight": "\u2192"
    }[keyName]
}

function hintWithKeys(leftKey, rightKey, leftKeyPressed, color) {
    document.querySelector("#hint").style.visibility = "visible"

    document.querySelector("#left-key").textContent = renderKey(leftKey)
    document.querySelector("#right-key").textContent = renderKey(rightKey)

    document.querySelector("#left-key").style.border = leftKeyPressed ? "2px solid " + color : "1px solid grey"
    document.querySelector("#right-key").style.border = !leftKeyPressed ? "2px solid " + color : "1px solid grey"
}

function translationHint(axis) {
    // console.log("showing translation hint")
    document.querySelector("#translation-hint").style.display = "inline"
    document.querySelector("#rotation-hint").style.display = "none"
    
    document.querySelector("#translation-left-hint").textContent = axis.directionName
    document.querySelector("#translation-right-hint").textContent = axis.inverseName

    document.querySelector("#translation-left-hint").style.color = axis.color
    document.querySelector("#translation-right-hint").style.color = axis.color
}

function rotationHint(changedAxisOne, changedAxisTwo, unchangedAxisOne, unchangedAxisTwo) {
    document.querySelector("#translation-hint").style.display = "none"
    document.querySelector("#rotation-hint").style.display = "inline"

    document.querySelector("#rotation-left-changed-hint").textContent = changedAxisOne.inThatDirection
    document.querySelector("#rotation-right-changed-hint").textContent = changedAxisTwo.inThatDirection
    document.querySelector("#rotation-left-unchanged-hint").textContent = unchangedAxisOne.inThatDirection
    document.querySelector("#rotation-right-unchanged-hint").textContent = unchangedAxisTwo.inThatDirection

    document.querySelector("#rotation-left-changed-hint").style.color = changedAxisOne.color
    document.querySelector("#rotation-right-changed-hint").style.color = changedAxisTwo.color
    document.querySelector("#rotation-left-unchanged-hint").style.color = unchangedAxisOne.color
    document.querySelector("#rotation-right-unchanged-hint").style.color = unchangedAxisTwo.color
}

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
            hintWithKeys(backKey, frontKey, true, axisDescriptions[i].color)
            translationHint(axisDescriptions[i])
        }
        lookupTable[frontKey] = () => {
            player.position = player.position.add(player.basis[i].scale(TRANSLATION_STEP))
            hintWithKeys(backKey, frontKey, false, axisDescriptions[i].color)
            translationHint(axisDescriptions[i])
        }
    })

    let counter = 0
    for (let j = 0; j < player.dimension; j++) {
        for (let i = 0; i < j; i++, counter++) {
            if (counter >= rotationKeyPairs.length) {
                throw new Error("Not enough rotations described for the given dimension")
            }

            const [leftKey, rightKey] = rotationKeyPairs[counter]

            const leftMatrix = Matrix.planarRotationMatrix(i, j, player.dimension, ROTATION_STEP)
            const rightMatrix = Matrix.planarRotationMatrix(i, j, player.dimension, -ROTATION_STEP)

            lookupTable[leftKey] = () => {
                player.updateBasisByMatrix(leftMatrix);

                hintWithKeys(leftKey, rightKey, true, "teal")
                rotationHint(
                    ...axisDescriptions.filter((_, index) => [i, j].includes(index)),
                    ...axisDescriptions.filter((_, index) => ![i, j].includes(index))
                )
            }
            lookupTable[rightKey] = () => {
                player.updateBasisByMatrix(rightMatrix);
                hintWithKeys(leftKey, rightKey, false, "teal")
                rotationHint(
                    ...axisDescriptions.filter((_, index) => [i, j].includes(index)),
                    ...axisDescriptions.filter((_, index) => ![i, j].includes(index))
                )
            }
        }
    }

    return lookupTable
}

const axisDescriptions = [
    new AxisDescription("forwards", "backwards", "in front", "behind", "goldenrod"),
    new AxisDescription("right", "left", "to the right", "to the left", "blue"),
    new AxisDescription("up", "down", "above", "below", "green"),
    new AxisDescription("ana", "kata", "ana", "kata", "hotpink"),
]

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
        ["KeyM", "KeyN"],
        ["KeyB", "KeyV"],
        ["KeyD", "KeyF"],
        ["KeyG", "KeyH"],
        ["KeyJ", "KeyK"]
    ],
    player
)

table["Space"] = (e) => {
    // Don't allow users to mash the space bar since it will incur high penalty
    if (e.repeat) {
        return;
    }

    player.score += maze.performCaptureAt(player.position)
    document.querySelector("#score").textContent = player.score
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const minFreq = 100
const maxFreq = 3000

// const pointsForSoundSampling = zOrderCurveND(4, 2).map(point => new HighDimensionalVector(point));

const dimensions = 4;
const offset = new HighDimensionalVector(Array(dimensions).fill(1)).scale(0.5).negate();

const interpolateList = (vecs, numSubPoints=1) => {
    if (vecs.length === 0) {
        return [];
    }
    const interpolatedVecs = [];
    let prev = vecs[0]
    interpolatedVecs.push(prev);
    for (let i = 1; i < vecs.length; i++) {

        const next = vecs[i];

        for (let j=0; j < numSubPoints; j++) {
            const p = (j+1) / (numSubPoints+1);

            const mid = prev.scale(1-p).add(next.scale(p));
            interpolatedVecs.push(mid);
        }

        interpolatedVecs.push(next);
    }
    return interpolatedVecs;
}

const pointsForSoundSampling = [
    ...interpolateList(zOrderCurveND(dimensions, 2).map(point => new HighDimensionalVector(point).add(offset)), 1),
    ...interpolateList(zOrderCurveND(dimensions, 2).map(point => new HighDimensionalVector(point).add(offset).scale(3)), 1),
]
const gainNodes = setUpGainNodes(audioCtx, minFreq, maxFreq, pointsForSoundSampling.length)

// Points for playing for 1 second
const screenOffPoints = -1
const screenOnPoints = -10

let lastTimeWithScreenOn = Infinity 
let isScreenOn = false 

function refreshTimeBasedScore() {
    player.score += performance.now() - lastTimeWithScreenOn >= 1 ? screenOffPoints : screenOnPoints
    document.querySelector("#score").textContent = player.score
}

const timePenaltyInterval = setInterval(refreshTimeBasedScore, 3000)

table["KeyZ"] = () => {
    isScreenOn = !isScreenOn

    document.querySelectorAll("canvas").forEach(canvas => {
        canvas.style.display = isScreenOn ? "inline" : "none"
    })

    if (!isScreenOn) {
        lastTimeWithScreenOn = performance.now()
    }

    document.querySelector("#screen-is-on").style.display = isScreenOn ? "block" : "none"
    document.querySelector("#screen-is-off").style.display = !isScreenOn ? "block" : "none"
}

window.addEventListener("keydown", (e) => {
    if (table[e.code]) {
        table[e.code](e)
        e.preventDefault()
    }

    projectOntoAxisAlignedPlane(topProjection, maze, player, 0, 1)
    player.rayTrace(maze, output, gains)

    updateSound(gainNodes, pointsForSoundSampling, point => {
        // const offset = new HighDimensionalVector(Array(point.components.length).fill(1)).scale(0.5).negate();
        const scaledAndOffsetPoint = point.scale(100);

        const rotatedPoint = (new Matrix(player.basis)).transformHighDimensionalVector(scaledAndOffsetPoint);

        return maze.amplitudeAt(player.position.add(rotatedPoint));
    });
    audioCtx.resume()
})