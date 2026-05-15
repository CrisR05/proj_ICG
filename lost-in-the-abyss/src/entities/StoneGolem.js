// src/entities/StoneGolem.js
import * as THREE from 'three';

export class StoneGolem extends THREE.Group {
    constructor(x, z) {
        super();
        this.type = 'golem';
        this.health = 100;
        this.maxHealth = 100;
        this.isAlerted = false;
        this.alertTime = 0;
        this.position.set(x, 0, z);
        
        this.createModel();
        this.createHitbox();
    }
    
    createModel() {
        // Materiais
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.8 });
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200 });
        
        // Corpo principal
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.8), rockMat);
        body.position.y = 0.75;
        body.castShadow = true;
        this.add(body);
        
        // Núcleo de lava (nas costas - ponto fraco)
        this.core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8), lavaMat);
        this.core.position.set(0, 0.8, -0.45);
        this.core.castShadow = true;
        this.add(this.core);
        
        // Cabeça
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.7), rockMat);
        head.position.y = 1.4;
        head.castShadow = true;
        this.add(head);
        
        // Olhos de lava
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6), eyeMat);
        leftEye.position.set(-0.2, 1.55, 0.4);
        this.add(leftEye);
        
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6), eyeMat);
        rightEye.position.set(0.2, 1.55, 0.4);
        this.add(rightEye);
        
        // Braços
        const armMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a });
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.2, 6), armMat);
        leftArm.position.set(-0.7, 1.0, 0);
        leftArm.rotation.z = 0.3;
        this.add(leftArm);
        
        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.2, 6), armMat);
        rightArm.position.set(0.7, 1.0, 0);
        rightArm.rotation.z = -0.3;
        this.add(rightArm);
        
        // Pernas
        const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.8, 6), armMat);
        leftLeg.position.set(-0.4, 0.4, 0);
        this.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.8, 6), armMat);
        rightLeg.position.set(0.4, 0.4, 0);
        this.add(rightLeg);
    }
    
    createHitbox() {
        this.hitbox = new THREE.Box3().setFromObject(this);
    }
    
    alert() {
        this.isAlerted = true;
        this.alertTime = 3;
        // Efeito visual - olhos brilham mais forte
        this.children.forEach(child => {
            if (child.material && child.material.emissiveIntensity) {
                child.material.emissiveIntensity = 1.5;
            }
        });
    }
    
    takeDamage(amount, source) {
        this.health -= amount;
        
        // Efeito visual de dano
        const flashMat = new THREE.MeshStandardMaterial({ color: 0xff8888 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4), flashMat);
        flash.position.copy(this.position);
        this.parent.add(flash);
        setTimeout(() => this.parent.remove(flash), 100);
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        // Efeito de explosão de lava
        for (let i = 0; i < 20; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 3),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 })
            );
            particle.position.copy(this.position);
            particle.position.x += (Math.random() - 0.5) * 1;
            particle.position.z += (Math.random() - 0.5) * 1;
            this.parent.add(particle);
            
            // Animação de queda
            let y = 0;
            const interval = setInterval(() => {
                particle.position.y += 0.1;
                y += 0.1;
                if (y > 2) {
                    clearInterval(interval);
                    this.parent.remove(particle);
                }
            }, 50);
        }
        
        this.parent.remove(this);
    }
    
    containsMesh(mesh) {
        return this.children.includes(mesh) || mesh.parent === this;
    }
    
    update(deltaTime, playerPosition) {
        if (this.isAlerted) {
            this.alertTime -= deltaTime;
            if (this.alertTime <= 0) this.isAlerted = false;
            
            // Move em direção ao jogador
            const direction = new THREE.Vector3().subVectors(playerPosition, this.position).normalize();
            this.position.x += direction.x * 2 * deltaTime;
            this.position.z += direction.z * 2 * deltaTime;
        }
        
        // Atualiza hitbox
        this.createHitbox();
    }
}