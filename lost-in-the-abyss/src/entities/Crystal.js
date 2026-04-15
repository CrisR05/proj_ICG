import * as THREE from 'three';

export class Crystal {
    constructor(color = 0x44aaff, size = 0.5) {
        this.mesh = new THREE.Group();
        this.color = color;
        this.collected = false;
        this.floatOffset = Math.random() * Math.PI * 2;
        
        // Núcleo facetado (icosaedro) – mais parecido com cristal real
        const coreGeo = new THREE.IcosahedronGeometry(size, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            roughness: 0.25,
            metalness: 0.3,
            flatShading: false,
            transparent: true,
            opacity: 0.95
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.castShadow = true;
        core.receiveShadow = true;
        this.mesh.add(core);
        
        // Invólucro exterior (wireframe mais discreto)
        const outerGeo = new THREE.IcosahedronGeometry(size * 1.2, 0);
        const outerMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.15,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        this.mesh.add(outer);
        
        // Luz pontual suave
        this.light = new THREE.PointLight(color, 0.8, 4);
        this.mesh.add(this.light);
        
        // Partículas orbitando (pó de luz)
        const particleCount = 4;
        for (let i = 0; i < particleCount; i++) {
            const particleGeo = new THREE.SphereGeometry(0.04, 6, 6);
            const particleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.userData = {
                angle: (i / particleCount) * Math.PI * 2,
                radius: size * 1.5,
                speed: 0.01 + Math.random() * 0.02
            };
            this.mesh.add(particle);
        }
    }
    
    update(deltaTime) {
        if (this.collected) return;
        
        // Flutuação suave
        const time = Date.now() * 0.004;
        this.mesh.position.y += Math.sin(time + this.floatOffset) * 0.003;
        
        // Rotação lenta
        this.mesh.rotation.y += deltaTime * 1.2;
        this.mesh.rotation.x += deltaTime * 0.4;
        
        // Atualiza partículas orbitantes
        this.mesh.children.forEach(child => {
            if (child.userData && child.userData.radius) {
                child.userData.angle += child.userData.speed;
                child.position.x = Math.cos(child.userData.angle) * child.userData.radius;
                child.position.z = Math.sin(child.userData.angle) * child.userData.radius;
                child.position.y = Math.sin(Date.now() * 0.008) * 0.2;
            }
        });
    }
}