import * as THREE from 'three';

export class Portal {
    constructor(color = 0x44ff88) {
        this.mesh = new THREE.Group();
        this.color = color;
        this.isActive = false;
        
        // Anel exterior
        const ringGeo = new THREE.TorusGeometry(1.5, 0.1, 16, 32);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.3,
            metalness: 0.8
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.receiveShadow = true;
        this.mesh.add(ring);
        
        // Portal interior (transparente)
        const portalGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.1, 16);
        const portalMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.5
        });
        const portal = new THREE.Mesh(portalGeo, portalMat);
        portal.rotation.x = Math.PI / 2;
        portal.position.y = 0.1;
        portal.receiveShadow = true;
        this.mesh.add(portal);
        
        // Partículas
        this.particles = [];
        for (let i = 0; i < 8; i++) {
            const particleGeo = new THREE.SphereGeometry(0.1);
            const particleMat = new THREE.MeshStandardMaterial({ color: color, emissive: color });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.userData.angle = (i / 8) * Math.PI * 2;
            this.mesh.add(particle);
            this.particles.push(particle);
        }
        
        // Luz
        this.light = new THREE.PointLight(color, 0.5, 8);
        this.mesh.add(this.light);
    }
    
    activate() {
        this.isActive = true;
        this.mesh.children[1].material.emissiveIntensity = 1.0;
        this.light.intensity = 2.0;
        this.light.color.setHex(0x88ff88);
    }
    
    update(deltaTime) {
        this.mesh.rotation.y += deltaTime * 0.5;
        
        // Partículas sobem e descem
        this.particles.forEach((p, i) => {
            p.position.x = Math.cos(p.userData.angle + Date.now() * 0.002) * 1.8;
            p.position.z = Math.sin(p.userData.angle + Date.now() * 0.002) * 1.8;
            p.position.y = 0.5 + Math.sin(Date.now() * 0.005 + i) * 0.5;
        });
        
        if (this.isActive) {
            this.light.intensity = 1.5 + Math.sin(Date.now() * 0.01) * 1.0;
        }
    }
}