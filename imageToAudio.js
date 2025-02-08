'use strict';


const hilbertCurve = (order, x0 = 0, y0 = 0, xi = 1, xj = 0, yi = 0, yj = 1, points = []) => {
    if (order === 0) {
        let x = x0 + (xi + yi) / 2;
        let y = y0 + (xj + yj) / 2;
        points.push([x, y]);
    } else {
        hilbertCurve(order - 1, x0, y0, yi / 2, yj / 2, xi / 2, xj / 2, points);
        hilbertCurve(order - 1, x0 + xi / 2, y0 + xj / 2, xi / 2, xj / 2, yi / 2, yj / 2, points);
        hilbertCurve(order - 1, x0 + xi / 2 + yi / 2, y0 + xj / 2 + yj / 2, xi / 2, xj / 2, yi / 2, yj / 2, points);
        hilbertCurve(order - 1, x0 + xi / 2 + yi, y0 + xj / 2 + yj, -yi / 2, -yj / 2, -xi / 2, -xj / 2, points);
    }
    return points;
}


const zOrderCurve = (order, x0 = 0, y0 = 0, size = 1, points = []) => {
    if (order === 0) {
      // For a cell of side length `size`, the center is at (x0 + size/2, y0 + size/2)
      const x = x0 + size / 2;
      const y = y0 + size / 2;
      points.push([x, y]);
    } else {
      const half = size / 2;
      // Visit the four quadrants in Z-order:
      // 1. Bottom-left quadrant
      zOrderCurve(order - 1, x0, y0, half, points);
      // 2. Bottom-right quadrant
      zOrderCurve(order - 1, x0 + half, y0, half, points);
      // 3. Top-left quadrant
      zOrderCurve(order - 1, x0, y0 + half, half, points);
      // 4. Top-right quadrant
      zOrderCurve(order - 1, x0 + half, y0 + half, half, points);
    }
    return points;
  }


  const zOrderCurveND = (dimensions, order, origin = undefined, size = 1, points = []) => {
    if (origin === undefined) {
        origin = Array(dimensions).fill(0);
    }
    if (order === 0) {
        // Compute center of the current hypercube
        const center = origin.map(coord => coord + size / 2);
        points.push(center);
    } else {
        const half = size / 2;
        const numSubcubes = 2 ** dimensions;
        
        for (let i = 0; i < numSubcubes; i++) {
            // Determine offsets for each dimension
            const offsets = Array.from({ length: dimensions }, (_, d) =>
                (i >> d) & 1 ? half : 0
            );
            
            // Compute new origin for the subcube
            const newOrigin = origin.map((coord, d) => coord + offsets[d]);
            
            // Recursively subdivide
            zOrderCurveND(dimensions, order - 1, newOrigin, half, points);
        }
    }
    return points;
};
  

const srcCanvas = document.createElement('canvas');
const w = 200;
const h = 200;
srcCanvas.width = w;
srcCanvas.height = h;
const srcCtx = srcCanvas.getContext('2d');
document.body.append(srcCanvas);


// const points = hilbertCurve(5);
// const points = zOrderCurve(2)
const points = zOrderCurveND(3, 3);

srcCtx.beginPath();
srcCtx.moveTo(points[0] * w, points[1] * h);
for (const point of points) {
    srcCtx.lineTo(point[0] * w, point[1] * h);
}
srcCtx.stroke();

// let circle = {x: 0.3, y: 0.5, r: 0.3};
const circles = [
    {center: [0.3, 0.5, 0.5], r: 0.3},
    {center: [0.1, 0.1, 0.2], r: 0.3},
]

const getAmplitude = point => {
    // if ((point[0] - circle.x)**2 + (point[1] - circle.y)**2 < circle.r**2) {
    //     return 1
    // }

    let s = 0;

    for(const circle of circles) {
        const distSquared = point.map((cord, i) => (cord - circle.center[i])**2).reduce((s,c) => s+c, 0);
        // if (distSquared < circle.r**2) {
        const v = 1/(1 + distSquared / circle.r**2);
        s += v**8;
        // }
    }

    return s;


    // if ((point[0] - 0.1)**2 + (point[1] - 0.9)**2 < 0.2**2) {
    //     return 1
    // }
    return 0;
}

const samples = points.map(getAmplitude);
for (const point of points) {
    srcCtx.fillStyle = `hsl(0, 100%, ${getAmplitude(point)*50}%)`;
    srcCtx.fillRect(point[0] * w, point[1] * h,3,3);
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const minFreq = 100;
const maxFreq = 3000;

const gainNodes = Array(points.length);
for (let i=0; i < points.length; i++) {
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
    // const freq = minFreq + (maxFreq-minFreq) * i/points.length;
    const freq = Math.exp(Math.log(minFreq) + i / points.length * (Math.log(maxFreq) - Math.log(minFreq)));
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = freq;
    oscillator.connect(gainNode);
    oscillator.start();
    gainNodes[i] = gainNode;
}

const updateSound = () => {
    for (let i=0; i < points.length; i++) {
        const point = points[i];
        const gainNode = gainNodes[i];
        gainNode.gain.value = getAmplitude(point) * 0.05;
    }
}

const render = () => {
    updateSound();
    srcCtx.clearRect(0, 0, w, h);
    for (const point of points) {
        const amplitude = getAmplitude(point);
        if (amplitude === 0) continue;
        // srcCtx.fillStyle = `hsl(0, 100%, ${amplitude*50}%)`;
        srcCtx.fillStyle = `hsla(0, 100%, 50%, ${amplitude})`;
        srcCtx.fillRect(point[0] * w, point[1] * h, 3, 3);
    }
}

document.body.addEventListener("keydown", e => {
    if (e.key === 'ArrowDown') {
        circles[0].center[1] += 0.02;
    } else if (e.key === 'ArrowUp') {
        circles[0].center[1] -= 0.02;
    } else if (e.key === 'ArrowLeft') {
        circles[0].center[0] -= 0.02;
    } else if (e.key === 'ArrowRight') {
        circles[0].center[0] += 0.02;
    } else if (e.key === '[') {
        circles[0].r -= 0.02;
    } else if (e.key === ']') {
        circles[0].r += 0.02;
    } else if (e.key === ',') {
        circles[0].center[2] -= 0.02;
    } else if (e.key === '.') {
        circles[0].center[2] += 0.02;
    }
    render()
    audioCtx.resume()
})

