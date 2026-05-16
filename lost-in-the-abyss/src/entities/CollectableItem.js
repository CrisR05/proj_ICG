// src/entities/CollectableItem.js
import * as THREE from 'three';

export class PickaxeItem extends THREE.Group {
    constructor(x, z) {
        super();
        this.position.set(x, 0.5, z);
        
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a });
        const headMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, metalness: 0.8 });
        
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), handleMat);
        handle.position.y = 0.3;
        this.add(handle);
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.2), headMat);
        head.position.set(0, 0.6, 0);
        head.rotation.z = 0.2;
        this.add(head);
        
        // Glow effect
        const glow = new THREE.PointLight(0xffaa66, 0.5, 2);
        glow.position.set(0, 0.4, 0);
        this.add(glow);
    }
}

export class AntidoteMushroom extends THREE.Group {
    constructor(x, z) {
        super();
        this.position.set(x, 0.5, z);
        this.collected = false;
        this.floatOffset = Math.random() * Math.PI * 2;
        
        // Stem (haste)
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.7 });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.35, 6), stemMat);
        stem.position.y = 0.2;
        stem.castShadow = true;
        this.add(stem);
        
        // Cap (chapéu) - VERMELHO BRILHANTE
        const capMat = new THREE.MeshStandardMaterial({ 
            color: 0xff3333, 
            emissive: 0xff2200,
            emissiveIntensity: 1.0,
            roughness: 0.3,
            metalness: 0.05
        });
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.18, 8), capMat);
        cap.position.y = 0.4;
        cap.castShadow = true;
        this.add(cap);
        
        // Pontos brancos no chapéu
        const spotMat = new THREE.MeshStandardMaterial({ color: 0xffdddd });
        const spots = [
            { x: 0.14, z: 0.12 }, { x: -0.12, z: 0.15 }, { x: 0.06, z: -0.14 },
            { x: -0.15, z: -0.06 }, { x: 0.0, z: 0.0 }, { x: 0.17, z: -0.09 },
            { x: -0.08, z: 0.18 }
        ];
        spots.forEach(pos => {
            const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6), spotMat);
            spot.position.set(pos.x, 0.49, pos.z);
            this.add(spot);
        });
        
        // LUZ VERMELHA PULSANTE (principal) - MAIS FORTE
        this.glowLight = new THREE.PointLight(0xff3300, 1.5, 8);
        this.glowLight.position.set(0, 0.5, 0);
        this.add(this.glowLight);
        
        // Luz vermelha ambiente ao redor
        this.ambientGlow = new THREE.PointLight(0xff2200, 0.8, 4);
        this.ambientGlow.position.set(0, 0.4, 0);
        this.add(this.ambientGlow);
        
        // Anel de partículas orbitantes (mais visível)
        this.orbits = [];
        for (let i = 0; i < 10; i++) {
            const orbitMat = new THREE.MeshStandardMaterial({ color: 0xff6666, emissive: 0xff3300 });
            const orbit = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6), orbitMat);
            orbit.userData = {
                angle: (i / 10) * Math.PI * 2,
                radius: 0.65,
                speed: 1.5 + Math.random()
            };
            this.add(orbit);
            this.orbits.push(orbit);
        }
        
        // Partículas vermelhas flutuantes
        this.particles = [];
        for (let i = 0; i < 15; i++) {
            const particleMat = new THREE.MeshStandardMaterial({ color: 0xff8888, emissive: 0xff4400, emissiveIntensity: 0.6 });
            const particle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6), particleMat);
            particle.userData = {
                angle: Math.random() * Math.PI * 2,
                radius: 0.4 + Math.random() * 0.4,
                speed: 0.8 + Math.random() * 1.5,
                yOffset: Math.random() * 0.6,
                ySpeed: 0.8 + Math.random()
            };
            this.add(particle);
            this.particles.push(particle);
        }
        
        // Luz auxiliar tipo "holofote" apontando para cima
        const upLight = new THREE.PointLight(0xff4400, 0.6, 5);
        upLight.position.set(0, 0.7, 0);
        this.add(upLight);
    }
    
    update(deltaTime) {
        if (this.collected) return;
        
        const time = Date.now() * 0.004;
        
        // Flutuação mais pronunciada (para destacar)
        this.position.y = 0.5 + Math.sin(time + this.floatOffset) * 0.15;
        
        // Rotação lenta
        this.rotation.y += deltaTime * 1.5;
        
        // PULSAÇÃO DA LUZ VERMELHA (batimento cardíaco)
        const intensePulse = 1.0 + Math.sin(time * 12) * 0.8;
        this.glowLight.intensity = 1.0 + Math.sin(time * 10) * 0.8;
        this.ambientGlow.intensity = 0.6 + Math.sin(time * 8) * 0.4;
        
        // Anima partículas orbitantes
        this.orbits.forEach((orbit, idx) => {
            const data = orbit.userData;
            data.angle += deltaTime * data.speed;
            orbit.position.x = Math.cos(data.angle) * data.radius;
            orbit.position.z = Math.sin(data.angle) * data.radius;
            orbit.position.y = 0.45 + Math.sin(time * 6 + idx) * 0.1;
            
            // Pulsação do brilho
            if (orbit.material) {
                orbit.material.emissiveIntensity = 0.5 + Math.sin(time * 15 + idx) * 0.4;
            }
        });
        
        // Anima partículas flutuantes
        this.particles.forEach((part, idx) => {
            const data = part.userData;
            data.angle += deltaTime * data.speed;
            part.position.x = Math.cos(data.angle + idx) * data.radius;
            part.position.z = Math.sin(data.angle + idx) * data.radius;
            part.position.y = data.yOffset + Math.sin(time * data.ySpeed + idx) * 0.12;
            
            if (part.material) {
                part.material.emissiveIntensity = 0.4 + Math.sin(time * 18 + idx) * 0.4;
            }
        });
    }
}

export class EnergyCrystal extends THREE.Group {
    constructor(x, z) {
        super();
        this.position.set(x, 0.5, z);
        this.collected = false;
        
        const crystalMat = new THREE.MeshStandardMaterial({ 
            color: 0x44aaff, 
            emissive: 0x2266aa,
            emissiveIntensity: 0.7,
            metalness: 0.8
        });
        
        const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), crystalMat);
        crystal.scale.set(0.8, 1.3, 0.8);
        this.add(crystal);
        
        // Pontas
        const tipMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488aa });
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), tipMat);
        tip.position.y = 0.45;
        this.add(tip);
        
        // Luz
        this.light = new THREE.PointLight(0x44aaff, 0.8, 3);
        this.light.position.set(0, 0.3, 0);
        this.add(this.light);
        
        // Partículas orbitantes
        this.particles = [];
        for (let i = 0; i < 8; i++) {
            const particleMat = new THREE.MeshStandardMaterial({ color: 0xaaffff, emissive: 0x44aaaa });
            const particle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6), particleMat);
            particle.userData = { angle: (i / 8) * Math.PI * 2, radius: 0.45, speed: 1.8 };
            this.add(particle);
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        if (this.collected) return;
        
        const time = Date.now() * 0.004;
        this.position.y = 0.45 + Math.sin(time) * 0.1;
        this.rotation.y += deltaTime * 2;
        
        this.light.intensity = 0.5 + Math.sin(time * 12) * 0.4;
        
        this.particles.forEach((part, i) => {
            part.userData.angle += deltaTime * part.userData.speed;
            part.position.x = Math.cos(part.userData.angle) * part.userData.radius;
            part.position.z = Math.sin(part.userData.angle) * part.userData.radius;
            part.position.y = Math.sin(time * 4 + i) * 0.12;
        });
    }
}