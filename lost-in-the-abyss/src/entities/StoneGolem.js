// src/entities/StoneGolem.js - VERSÃO MELHORADA
import * as THREE from 'three';
import { BossEnemy } from './BossEnemy.js';

export class StoneGolem extends BossEnemy {
    constructor(x, z, level = 1) {
        super(x, z, 2.0);  // 2x maior que o player
        this.type = 'golem';
        this.setLevel(level);
        
        // Stats específicos do Golem
        this.moveSpeed = 1.5 + (level - 1) * 0.1;
        this.attackDamage = 20;
        this.attackRange = 3.0;
        this.detectionRange = 15;
        
        // Ataque especial (slam)
        this.slamCooldown = 0;
        this.slamDamage = 30;
        
        this.createModel();
        this.createHealthBar();
    }
    
    createModel() {
        // Mantém seu modelo existente
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.8 });
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200 });
        
        // Corpo (maior)
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.0), rockMat);
        body.position.y = 0.9;
        body.castShadow = true;
        this.add(body);
        
        // Núcleo (ponto fraco)
        this.core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8), lavaMat);
        this.core.position.set(0, 1.0, -0.55);
        this.add(this.core);
        
        // Cabeça
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.8), rockMat);
        head.position.y = 1.7;
        this.add(head);
        
        // Olhos (brilham quando alerta)
        this.eyeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 });
        this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6), this.eyeMat);
        this.leftEye.position.set(-0.25, 1.85, 0.45);
        this.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6), this.eyeMat);
        this.rightEye.position.set(0.25, 1.85, 0.45);
        this.add(this.rightEye);
        
        // Braços
        const armMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a });
        this.leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 6), armMat);
        this.leftArm.position.set(-0.9, 1.2, 0);
        this.leftArm.rotation.z = 0.3;
        this.add(this.leftArm);
        
        this.rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 6), armMat);
        this.rightArm.position.set(0.9, 1.2, 0);
        this.rightArm.rotation.z = -0.3;
        this.add(this.rightArm);
        
        // Pernas
        const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.0, 6), armMat);
        leftLeg.position.set(-0.5, 0.5, 0);
        this.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.0, 6), armMat);
        rightLeg.position.set(0.5, 0.5, 0);
        this.add(rightLeg);
    }
    
    createHealthBar() {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 24;
        this.healthCanvas = canvas;
        this.healthTexture = new THREE.CanvasTexture(canvas);
        
        const barMaterial = new THREE.SpriteMaterial({ map: this.healthTexture });
        this.healthBar = new THREE.Sprite(barMaterial);
        this.healthBar.scale.set(2.0, 0.4, 1);
        this.healthBar.position.y = 2.4;
        this.add(this.healthBar);
        
        this.updateHealthBar();
    }
    
    updateHealthBar() {
        if (!this.healthCanvas) return;
        const ctx = this.healthCanvas.getContext('2d');
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, 120, 24);
        
        const percent = this.health / this.maxHealth;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(2, 2, 116 * percent, 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`💀 ${Math.floor(this.health)}/${this.maxHealth}`, 30, 18);
        
        this.healthTexture.needsUpdate = true;
    }
    
    onDetect() {
        // Rugido e olhos brilham
        this.eyeMat.emissiveIntensity = 1.2;
        this.core.material.emissiveIntensity = 1.0;
        
        // Efeito visual de "detecção"
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200 });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.5, 16), ringMat);
        ring.position.copy(this.position);
        ring.position.y = 0.1;
        ring.rotation.x = -Math.PI / 2;
        this.parent.add(ring);
        setTimeout(() => this.parent.remove(ring), 300);
    }
    
    executeAttack(playerPosition) {
        const dist = this.position.distanceTo(playerPosition);
        if (dist < this.attackRange) {
            this.playAttackAnimation();
            return this.attackDamage;
        }
        return 0;
    }
    
    playAttackAnimation() {
        // Braço direito sobe e bate
        this.rightArm.rotation.z = -1.2;
        setTimeout(() => {
            this.rightArm.rotation.z = -0.3;
            
            // Efeito de impacto no chão
            const ringMat = new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff4400 });
            const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 1.2, 16), ringMat);
            ring.position.copy(this.position);
            ring.position.y = 0.1;
            ring.rotation.x = -Math.PI / 2;
            this.parent.add(ring);
            setTimeout(() => this.parent.remove(ring), 200);
        }, 200);
    }
    
    die() {
        // Explosão de lava e desmoronamento
        for (let i = 0; i < 50; i++) {
            const debris = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.15),
                new THREE.MeshStandardMaterial({ color: 0x8a7a6a })
            );
            debris.position.copy(this.position);
            debris.position.x += (Math.random() - 0.5) * 2;
            debris.position.z += (Math.random() - 0.5) * 2;
            this.parent.add(debris);
            
            let y = 0;
            const interval = setInterval(() => {
                debris.position.y += 0.15;
                y += 0.15;
                if (y > 2) {
                    clearInterval(interval);
                    this.parent.remove(debris);
                }
            }, 30);
        }
        
        this.parent.remove(this);
    }
    
    update(deltaTime, playerPosition) {
        // Atualiza cooldown do slam
        if (this.slamCooldown > 0) {
            this.slamCooldown -= deltaTime;
        }
        
        // Usa a lógica da classe base
        const damage = super.update(deltaTime, playerPosition);
        
        // Ataque especial (slam) quando health < 30%
        if (this.health < this.maxHealth * 0.3 && this.slamCooldown <= 0 && this.state === 'CHASING') {
            this.slamCooldown = 3;
            this.specialAttack(playerPosition);
        }
        
        return damage;
    }
    
    specialAttack(playerPosition) {
        this.state = 'ATTACKING';
        this.stateTimer = 0.8;
        
        // Pulo e slam
        const startY = this.position.y;
        const jumpInterval = setInterval(() => {
            if (this.position.y < 0.8) {
                this.position.y += 0.1;
            } else {
                clearInterval(jumpInterval);
                // Slam
                this.position.y = 0;
                const dist = this.position.distanceTo(playerPosition);
                if (dist < 4) {
                    // Dano em área
                    if (this.combatSystem) {
                        this.combatSystem.damagePlayer(this.slamDamage);
                    }
                }
                // Efeito de onda de choque
                const waveMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 });
                for (let r = 0.5; r <= 3; r += 0.5) {
                    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.3, r, 24), waveMat);
                    ring.position.copy(this.position);
                    ring.position.y = 0.1;
                    ring.rotation.x = -Math.PI / 2;
                    this.parent.add(ring);
                    setTimeout(() => this.parent.remove(ring), 300);
                }
            }
        }, 50);
    }
    // Adicione no final da classe StoneGolem, antes do último }

// Melhora o update para ter estados e ataques
update(deltaTime, playerPosition) {
    // Cria estados se não existirem
    if (this.state === undefined) {
        this.state = 'IDLE';
        this.attackCooldown = 0;
        this.attackTimer = 0;
        this.moveSpeed = 1.8;
        this.attackRange = 2.5;
        this.detectionRange = 12;
        this.attackDamage = 20;
    }
    
    // Atualiza cooldown
    if (this.attackCooldown > 0) {
        this.attackCooldown -= deltaTime;
    }
    
    const distToPlayer = this.position.distanceTo(playerPosition);
    
    // IDLE -> CHASING
    if (this.state === 'IDLE' && distToPlayer < this.detectionRange) {
        this.state = 'CHASING';
        this.alert();
        console.log("Golem detected player!");
    }
    
    // CHASING -> ATTACKING
    if (this.state === 'CHASING') {
        if (distToPlayer < this.attackRange && this.attackCooldown <= 0) {
            this.state = 'ATTACKING';
            this.attackTimer = 0.5;
        } else if (distToPlayer > this.detectionRange * 1.5) {
            this.state = 'IDLE';
        } else {
            // Move em direção ao jogador, mas sem colidir
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.position)
                .normalize();
            
            let newX = this.position.x + direction.x * this.moveSpeed * deltaTime;
            let newZ = this.position.z + direction.z * this.moveSpeed * deltaTime;
            
            // Mantém distância mínima do player (não encosta)
            const distAfter = Math.hypot(newX - playerPosition.x, newZ - playerPosition.z);
            if (distAfter > 1.2) {
                this.position.x = newX;
                this.position.z = newZ;
            }
            
            // Rotação
            const angle = Math.atan2(direction.x, direction.z);
            this.rotation.y = angle;
        }
    }
    
    // ATTACKING
    if (this.state === 'ATTACKING') {
        this.attackTimer -= deltaTime;
        if (this.attackTimer <= 0) {
            // Executa ataque
            if (distToPlayer < this.attackRange) {
                // Dano no player (vai ser aplicado pelo CombatSystem)
                this.isAttacking = true;
                this.playAttackAnimation();
            }
            this.state = 'CHASING';
            this.attackCooldown = 1.2;
        }
    }
    
    // Anima o núcleo
    if (this.core && this.core.material) {
        const pulse = Math.sin(Date.now() * 0.008) * 0.5 + 0.5;
        this.core.material.emissiveIntensity = 0.5 + pulse;
    }
}

playAttackAnimation() {
    // Efeito de impacto
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.5, 16), ringMat);
    ring.position.copy(this.position);
    ring.position.y = 0.1;
    ring.rotation.x = -Math.PI / 2;
    this.parent.add(ring);
    setTimeout(() => this.parent.remove(ring), 300);
}
}