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

const setUpGainNodes = (minFreq, maxFreq, numberOfPoints) => Array(numberOfPoints).fill().map((_, i) => {
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

    return gainNode
})

const updateSound = (gainNodes, points, getAmplitude) => {
    for (let i=0; i < points.length; i++) {
        const point = points[i];
        const gainNode = gainNodes[i];
        gainNode.gain.value = getAmplitude(point) * 0.05;
    }
}