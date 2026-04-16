import * as THREE from 'three';

export class Portal {
    constructor(color = 0x44ff88) {
        this.mesh = new THREE.Group();
        this.color = color;
        this.isActive = false;
        this.rotationY = 0;
        
        // ===== MOLDURA DE PEDRA =====
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x886644,
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x221100
        });
        
        const width = 2.2;
        const height = 3.2;   
        const depth = 0.3;
        
        const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, height, depth), frameMaterial);
        leftPillar.position.set(-width/2, height/2, 0);
        this.mesh.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, height, depth), frameMaterial);
        rightPillar.position.set(width/2, height/2, 0);
        this.mesh.add(rightPillar);
        
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.4, depth), frameMaterial);
        lintel.position.set(0, height, 0);
        this.mesh.add(lintel);
        
        const threshold = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.2, depth), frameMaterial);
        threshold.position.set(0, 0.1, 0);
        this.mesh.add(threshold);
        
        const portalGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.1, 32);
        const portalMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        this.portalDisc = new THREE.Mesh(portalGeo, portalMat);
        this.portalDisc.rotation.x = Math.PI / 2;
        this.portalDisc.position.set(0, height/2, 0.05);
        this.mesh.add(this.portalDisc);
        
        const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 32, 64);
        const ringMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.ring.rotation.x = Math.PI / 2;
        this.ring.position.set(0, height/2, 0.1);
        this.mesh.add(this.ring);
        
        this.particles = [];
        for (let i = 0; i < 20; i++) {
            const particleGeo = new THREE.SphereGeometry(0.05, 6, 6);
            const particleMat = new THREE.MeshStandardMaterial({ color: color, emissive: color });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.userData = {
                angle: Math.random() * Math.PI * 2,
                radius: 0.8 + Math.random() * 0.6,
                speed: 0.5 + Math.random() * 1.5,
                yOffset: Math.random() * height
            };
            this.mesh.add(particle);
            this.particles.push(particle);
        }
        
        // Luz principal
        this.light = new THREE.PointLight(color, 0.8, 10);
        this.light.position.set(0, height/2, 0.5);
        this.mesh.add(this.light);
        
        // Glow
        const glowGeo = new THREE.SphereGeometry(1.8, 16, 16);
        const glowMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        this.glow.position.set(0, height/2, 0);
        this.mesh.add(this.glow);
        
        this.indicatorLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x441111, emissiveIntensity: 0.8 })
        );
        this.indicatorLight.position.set(0, height + 0.25, 0.25);
        this.mesh.add(this.indicatorLight);
        
        this.indicatorGlow = new THREE.PointLight(0xff3333, 0.6, 3);
        this.indicatorLight.add(this.indicatorGlow);
    }
    
    activate() {
        this.isActive = true;
        this.portalDisc.material.emissiveIntensity = 1.2;
        this.ring.material.emissiveIntensity = 1.5;
        this.light.intensity = 2.5;
        this.glow.material.emissiveIntensity = 0.6;
        
        // Botão fica verde
        this.indicatorLight.material.color.setHex(0x33ff33);
        this.indicatorLight.material.emissive.setHex(0x116611);
        this.indicatorGlow.color.setHex(0x33ff33);
        this.indicatorGlow.intensity = 1.2;
    }
    
    update(deltaTime) {
        this.ring.rotation.z += deltaTime * 1.5;
        
        const time = Date.now() * 0.003;
        this.particles.forEach((p, idx) => {
            const data = p.userData;
            data.angle += deltaTime * data.speed;
            const x = Math.cos(data.angle + idx) * data.radius;
            const z = Math.sin(data.angle + idx) * data.radius;
            const y = data.yOffset + Math.sin(time * 2 + idx) * 0.2;
            p.position.set(x, y, z);
        });
        
        if (this.isActive) {
            const pulse = 0.8 + Math.sin(time * 8) * 0.3;
            this.light.intensity = 1.8 + Math.sin(time * 10) * 0.7;
            this.portalDisc.material.emissiveIntensity = 0.8 + Math.sin(time * 12) * 0.4;
            this.ring.material.emissiveIntensity = 1.2 + Math.sin(time * 15) * 0.5;
        } else {
            const idle = 0.4 + Math.sin(time * 2) * 0.1;
            this.portalDisc.material.emissiveIntensity = idle;
            this.light.intensity = 0.6 + Math.sin(time * 2.5) * 0.2;
        }
    }
    
    setOrientation(angleY) {
        this.mesh.rotation.y = angleY;
    }
}