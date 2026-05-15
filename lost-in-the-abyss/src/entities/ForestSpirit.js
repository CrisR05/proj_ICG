// src/entities/ForestSpirit.js
import * as THREE from 'three';

export class ForestSpirit extends THREE.Group {
    constructor(x, z) {
        super();
        this.type = 'spirit';
        this.health = 60;
        this.antidoteCount = 0;
        this.isVulnerable = false;
        this.position.set(x, 0, z);
        
        this.createModel();
    }
    
    createModel() {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00aa66 });
        
        // Corpo (tronco)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.2, 6), woodMat);
        body.position.y = 0.6;
        body.castShadow = true;
        this.add(body);
        
        // Cabeça
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8), woodMat);
        head.position.y = 1.2;
        head.castShadow = true;
        this.add(head);
        
        // Olhos brilhantes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00aa66 });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6), eyeMat);
        leftEye.position.set(-0.12, 1.3, 0.35);
        this.add(leftEye);
        
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6), eyeMat);
        rightEye.position.set(0.12, 1.3, 0.35);
        this.add(rightEye);
        
        // Chifres de galho
        const branchMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
        const leftHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 4), branchMat);
        leftHorn.position.set(-0.2, 1.45, 0);
        leftHorn.rotation.z = -0.3;
        this.add(leftHorn);
        
        const rightHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 4), branchMat);
        rightHorn.position.set(0.2, 1.45, 0);
        rightHorn.rotation.z = 0.3;
        this.add(rightHorn);
        
        // Braços de galho
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 4), branchMat);
        leftArm.position.set(-0.5, 0.9, 0);
        leftArm.rotation.z = 0.5;
        this.add(leftArm);
        
        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 4), branchMat);
        rightArm.position.set(0.5, 0.9, 0);
        rightArm.rotation.z = -0.5;
        this.add(rightArm);
        
        // Partículas de esporos
        this.spores = [];
        for (let i = 0; i < 15; i++) {
            const spore = new THREE.Mesh(new THREE.SphereGeometry(0.03, 3), glowMat);
            spore.position.set(
                (Math.random() - 0.5) * 1,
                Math.random() * 1.5,
                (Math.random() - 0.5) * 1
            );
            this.add(spore);
            this.spores.push(spore);
        }
    }
    
    applyAntidote() {
        this.antidoteCount++;
        
        if (this.antidoteCount >= 3) {
            this.isVulnerable = true;
            // Efeito visual - fica pálido
            this.children.forEach(child => {
                if (child.material && child.material.color) {
                    child.material.color.setHex(0x888888);
                }
            });
        } else {
            // Efeito de dano visual
            const flash = new THREE.MeshStandardMaterial({ color: 0x88ffaa });
            const effect = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4), flash);
            effect.position.copy(this.position);
            this.parent.add(effect);
            setTimeout(() => this.parent.remove(effect), 150);
        }
    }
    
    takeDamage(amount, source) {
        if (!this.isVulnerable && source !== 'antidote') {
            // Imune a ataques normais antes de 3 antídotos
            return;
        }
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        // Efeito de dissolução em pó verde
        for (let i = 0; i < 30; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 3),
                new THREE.MeshStandardMaterial({ color: 0x66ffaa, emissive: 0x33aa66 })
            );
            particle.position.copy(this.position);
            particle.position.x += (Math.random() - 0.5) * 1;
            particle.position.z += (Math.random() - 0.5) * 1;
            this.parent.add(particle);
            
            setTimeout(() => this.parent.remove(particle), 500);
        }
        
        this.parent.remove(this);
    }
    
    containsMesh(mesh) {
        return this.children.includes(mesh) || mesh.parent === this;
    }
    
    update(deltaTime, playerPosition) {
        // Movimento flutuante
        this.position.y = Math.sin(Date.now() * 0.003) * 0.1;
        
        // Move em direção ao jogador quando vulnerável
        if (this.isVulnerable) {
            const direction = new THREE.Vector3().subVectors(playerPosition, this.position).normalize();
            this.position.x += direction.x * 1.5 * deltaTime;
            this.position.z += direction.z * 1.5 * deltaTime;
        }
        
        // Anima esporos
        this.spores.forEach((spore, i) => {
            spore.position.y += Math.sin(Date.now() * 0.005 + i) * 0.005;
        });
    }
}