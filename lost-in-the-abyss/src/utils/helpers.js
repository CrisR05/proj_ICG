import * as THREE from 'three';

// Gera um número inteiro aleatório entre min e max (inclusive)
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Escolhe um elemento aleatório de um array
export function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Gera uma textura procedural de pedra (fallback se não houver imagem)
export function generateStoneTexture(baseColor, variationColor = 0x888888) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const base = '#' + baseColor.toString(16).padStart(6, '0');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    
    // Ruído
    for (let i = 0; i < 80000; i++) {
        const x = Math.floor(Math.random() * 512);
        const y = Math.floor(Math.random() * 512);
        const brightness = 80 + Math.random() * 100;
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // Linhas de argamassa
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 6;
    for (let i = 0; i < 512; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
}

// Gera um Normal Map procedural simples
export function generateNormalMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base roxa (normal apontando para cima)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 512, 512);
    
    // Variações para simular relevo
    for (let i = 0; i < 40000; i++) {
        const x = Math.floor(Math.random() * 512);
        const y = Math.floor(Math.random() * 512);
        const r = 128 + Math.random() * 64;
        const g = 128 + Math.random() * 64;
        const b = 255;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 2, 2);
    }
    
    return new THREE.CanvasTexture(canvas);
}