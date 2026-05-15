// src/entities/MoonLurker.js
import * as THREE from 'three';

export class MoonLurker extends THREE.Group {
    constructor(x, z) {
        super();
        this.type = 'lurker';
        this.health = 80;
        this.position.set(x, 0, z);
        
        this.createModel();
    }
    
    createModel() {
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.6, roughness: 0.3 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x0088aa });
        
        // Corpo
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4), skinMat);
        body.position.y = 0.8;
        body.castShadow = true;
        this.add(body);
        
        // Cabeça
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16), skinMat);
        head.position.y = 1.35;
        head.castShadow = true;
        this.add(head);
        
        // Visor bioluminescente (ponto fraco)
        this.visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), glowMat);
        this.visor.position.set(0, 1.35, 0.35);
        this.visor.castShadow = true;
        this.add(this.visor);
        
        // Braços
        const armMat = new THREE.MeshStandardMaterial({ color: 0xbbbbcc });
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.8, 6), armMat);
        leftArm.position.set(-0.45, 1.0, 0);
        leftArm.rotation.z = 0.4;
        this.add(leftArm);
        
        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.8, 6), armMat);
        rightArm.position.set(0.45, 1.0, 0);
        rightArm.rotation.z = -0.4;
        this.add(rightArm);
        
        // Garras
        const clawMat = new THREE.MeshStandardMaterial({ color: 0xaaaaff });
        const leftClaw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), clawMat);
        leftClaw.position.set(-0.45, 0.55, 0.1);
        this.add(leftClaw);
        
        const rightClaw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), clawMat);
        rightClaw.position.set(0.45, 0.55, 0.1);
        this.add(rightClaw);
        
        // Cauda
        const tailMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc });
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.6, 4), tailMat);
        tail.position.set(0, 0.5, -0.5);
        tail.rotation.x = 0.5;
        this.add(tail);
    }
    
    takeDamage(amount, source) {
        this.health -= amount;
        
        // Efeito visual de choque
        for (let i = 0; i < 10; i++) {
            const spark = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 2),
                new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x0088aa })
            );
            spark.position.copy(this.position);
            spark.position.x += (Math.random() - 0.5) * 0.8;
            spark.position.z += (Math.random() - 0.5) * 0.8;
            this.parent.add(spark);
            setTimeout(() => this.parent.remove(spark), 200);
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        // Explosão de energia azul
        for (let i = 0; i < 40; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 3),
                new THREE.MeshStandardMaterial({ color: 0x44ffff, emissive: 0x0088aa })
            );
            particle.position.copy(this.position);
            particle.position.x += (Math.random() - 0.5) * 1.2;
            particle.position.z += (Math.random() - 0.5) * 1.2;
            this.parent.add(particle);
            
            setTimeout(() => this.parent.remove(particle), 400);
        }
        
        this.parent.remove(this);
    }
    
    containsMesh(mesh) {
        return this.children.includes(mesh) || mesh.parent === this;
    }
    
    update(deltaTime, playerPosition) {
        // Movimento rápido em direção ao jogador
        const direction = new THREE.Vector3().subVectors(playerPosition, this.position).normalize();
        this.position.x += direction.x * 3 * deltaTime;
        this.position.z += direction.z * 3 * deltaTime;
        
        // Rotação para olhar para o jogador
        const angle = Math.atan2(direction.x, direction.z);
        this.rotation.y = angle;
        
        // Animação do visor
        if (this.visor.material) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            this.visor.material.emissiveIntensity = 0.5 + pulse * 0.5;
        }
    }
}