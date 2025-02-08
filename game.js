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
        console.log("calculating gradient of", this, "by", this.startPoint.y, this.startPoint.x, this.gradient())
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

class Ray {
    constructor(startPoint, direction) {
        this.startPoint = startPoint
        this.direction = direction
        this.gradient = Math.tan(direction)
    }

    translate(offset) {
        return new Ray(this.startPoint.translate(offset), this.direction)
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
    constructor (position) {
        this.position = position
        this.direction = 0
    }

    look(maze) {
        for (let wall of maze.walls) {
            wall.color = "black"
        }

        const ray = new Ray(this.position, this.direction)
        const closestWall = ray.findFirstWall(maze.walls)

        if (closestWall) {
            closestWall.color = "blue"
        }
    }

    rayTrace(maze, output) {
        output.clearRect(0, 0, output.canvas.width, output.canvas.height)
        const fieldOfView = Math.PI / 2
        
        const centre = (output.canvas.height - 20) / 2
        
        for (let i = 0; i < output.canvas.width; i++) {
            const angleOffset = -fieldOfView/2 + (i * fieldOfView / output.canvas.width)
            const angle = this.direction + angleOffset

            const ray = new Ray(this.position, angle)
            const closestWall = ray.findFirstWall(maze.walls)

            if (closestWall) {
                const fisheyeHeight = 10000 / closestWall.distanceAlongRay(ray)
                const height = fisheyeHeight / Math.cos(angleOffset)

                output.beginPath()
                output.strokeStyle = "orange"
                output.moveTo(i, centre - height / 2)
                output.lineTo(i, centre + height / 2)
                output.stroke()
            }
        }
    }
}

class Maze {
    constructor (walls) {
        this.walls = walls
    }
}

const maze = new Maze([
    new Wall(new Point(10, 10), new Point(10, 100)),
    new Wall(new Point(50, 10), new Point(50, 100)),
    new Wall(new Point(10, 10), new Point(50, 10))
])

function renderMaze2D(ctx, maze, player) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Render the player
    ctx.beginPath()
    ctx.strokeStyle = "red"
    ctx.arc(...player.position, 20, player.direction - Math.PI / 2, player.direction + Math.PI / 2)
    ctx.stroke()

    // Recolour the walls
    player.look(maze)

    // Render the walls
    for (let wall of maze.walls) {
        ctx.beginPath()
        ctx.strokeStyle = wall.color
        ctx.moveTo(...wall.startPoint)
        ctx.lineTo(...wall.endPoint)
        ctx.stroke()
    }
}

window.addEventListener("load", () => {
    const topProjectionCanvas = document.querySelector("#top")
    const topProjection = topProjectionCanvas.getContext("2d")

    const outputCanvas = document.querySelector("#raytraced")
    const output = outputCanvas.getContext("2d")

    const player = new Player(new Point(200, 200))

    const audioContext = new AudioContext()
    const minFrequency = 100
    const maxFrequency = 10000

    const oscillators = []

    for (let i = 0; i < outputCanvas.width; i++) {
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.connect(audioContext.destination)
        oscillator.frequency.value = minFrequency + i / (maxFrequency - minFrequency)

        oscillators.push(oscillator)
    }

    renderMaze2D(topProjection, maze, player)

    window.addEventListener("keydown", (e) => {
        oscillators.forEach(oscillator => oscillator.start())

        switch (e.code) {
            case "ArrowLeft":
                player.direction -= 0.1 
                break;
            case "ArrowRight":
                player.direction += 0.1 
                break;
            case "ArrowUp":
                player.position = player.position.moveInDirection(5, player.direction)
                break;
            case "ArrowDown":
                player.position = player.position.moveInDirection(-5, player.direction)
                break;
        }
        renderMaze2D(topProjection, maze, player)
        player.rayTrace(maze, output)
    })
})