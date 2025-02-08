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


const srcCanvas = document.createElement('canvas');
const w = 200;
const h = 200;
srcCanvas.width = w;
srcCanvas.height = h;
const srcCtx = srcCanvas.getContext('2d');
document.body.append(srcCanvas);

// srcCtx.fillRect(50,100,50,50);

const points = hilbertCurve(5);

srcCtx.beginPath();
srcCtx.moveTo(points[0] * w, points[1] * h);
for (const point of points) {
    srcCtx.lineTo(point[0] * w, point[1] * h);
}
srcCtx.stroke();

let circle = {x: 0.3, y: 0.5, r: 0.3};

const getAmplitude = point => {
    if ((point[0] - circle.x)**2 + (point[1] - circle.y)**2 < circle.r**2) {
        return 1
    }
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





// function createSuperposedSine(frequencies, duration = 2) {
//     const gainNode = audioCtx.createGain();
//     gainNode.gain.value = 0.1; // Adjust overall volume
//     gainNode.connect(audioCtx.destination);
    
//     frequencies.forEach(freq => {
//         const oscillator = audioCtx.createOscillator();
//         oscillator.type = 'sine';
//         oscillator.frequency.value = freq;
//         oscillator.connect(gainNode);
//         oscillator.start();
//         oscillator.stop(audioCtx.currentTime + duration);
//     });
// }

// // Example: Superposition of 300Hz, 400Hz, and 500Hz
// createSuperposedSine([300, 400, 500]);

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const minFreq = 100;
const maxFreq = 10000;

const gainNodes = Array(points.length);
for (let i=0; i < points.length; i++) {
    const point = points[i];
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

function createSound({duration = 2} = {}) {
    
    // frequencies.forEach(freq => {
    //     const oscillator = audioCtx.createOscillator();
    //     oscillator.type = 'sine';
    //     oscillator.frequency.value = freq;
    //     oscillator.connect(gainNode);
    //     oscillator.start();
    //     oscillator.stop(audioCtx.currentTime + duration);
    // });


    for (let i=0; i < points.length; i++) {
        const point = points[i];
        const gainNode = gainNodes[i];
        gainNode.gain.value = getAmplitude(point) * 0.05;
    }
}

// createSound()

window.addEventListener("click", () => audioCtx.resume())

const render = () => {
    const interval = 1/10;
    createSound({duration: interval});
    srcCtx.clearRect(0, 0, w, h);
    for (const point of points) {
        srcCtx.fillStyle = `hsl(0, 100%, ${getAmplitude(point)*50}%)`;
        srcCtx.fillRect(point[0] * w, point[1] * h, 3, 3);
    }

    // setTimeout(render, 1000/60);
}

document.body.addEventListener("keydown", e => {
    if (e.key === 'ArrowDown') {
        circle.y += 0.02;
    } else if (e.key === 'ArrowUp') {
        circle.y -= 0.02;
    } else if (e.key === 'ArrowLeft') {
        circle.x -= 0.02;
    } else if (e.key === 'ArrowRight') {
        circle.x += 0.02;
    } else if (e.key === '[') {
        circle.r -= 0.02;
    } else if (e.key === ']') {
        circle.r += 0.02;
    }
    render()
    audioCtx.resume()
})

