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

const gainNodes = setUpGainNodes(audioCtx, minFreq, maxFreq, points.length)

const render = () => {
    updateSound(gainNodes, points, getAmplitude);
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

