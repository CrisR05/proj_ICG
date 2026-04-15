import * as THREE from 'three';

export class Crystal {
    constructor(color = 0x44aaff) {
        this.mesh = new THREE.Group();
        this.color = color;
        this.collected = false;
        this.floatOffset = Math.random() * Math.PI * 2;
        
        // Núcleo brilhante
        const coreGeo = new THREE.OctahedronGeometry(0.7);
        const coreMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.castShadow = true;
        core.receiveShadow = true;
        this.mesh.add(core);
        
        // Invólucro exterior (wireframe)
        const outerGeo = new THREE.IcosahedronGeometry(0.9);
        const outerMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        this.mesh.add(outer);
        
        // Luz pontual
        this.light = new THREE.PointLight(color, 1.2, 6);
        this.mesh.add(this.light);
        
        // Partículas orbitando (efeito visual)
        const particlesGeo = new THREE.SphereGeometry(0.08);
        const particlesMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color });
        for (let i = 0; i < 3; i++) {
            const particle = new THREE.Mesh(particlesGeo, particlesMat);
            particle.userData.angle = (i / 3) * Math.PI * 2;
            particle.userData.radius = 1.2;
            particle.userData.speed = 0.02;
            this.mesh.add(particle);
        }
    }
    
    update(deltaTime) {
        if (this.collected) return;
        
        // Flutuação
        this.mesh.position.y += Math.sin(Date.now() * 0.005 + this.floatOffset) * 0.005;
        
        // Rotação
        this.mesh.rotation.y += deltaTime * 1.5;
        this.mesh.rotation.x += deltaTime * 0.5;
        
        // Atualiza partículas orbitantes
        this.mesh.children.forEach((child, index) => {
            if (child.userData.radius) {
                child.userData.angle += child.userData.speed;
                child.position.x = Math.cos(child.userData.angle) * child.userData.radius;
                child.position.z = Math.sin(child.userData.angle) * child.userData.radius;
                child.position.y = Math.sin(Date.now() * 0.01 + index) * 0.3;
            }
        });
    }
}