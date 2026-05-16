// src/entities/ForestSpirit.js
import * as THREE from 'three';

export class ForestSpirit extends THREE.Group {
    constructor(x, z, level = 1) {
        super();
        this.type = 'spirit';
        this.position.set(x, 0, z);
        
        // Stats com escala MAIOR
        this.scale.set(1.8, 1.8, 1.8); // 80% maior que o player
        
        // Status de combate
        this.health = 80;
        this.maxHealth = 80;
        this.attackDamage = 15;
        this.attackRange = 2.5;
        this.detectionRange = 15;
        this.moveSpeed = 1.8;
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        
        // Estado da máquina
        this.state = 'IDLE'; // IDLE, CHASING, ATTACKING
        this.stateTimer = 0;
        
        // Sistema de antídoto
        this.antidoteCount = 0;
        this.isVulnerable = false;
        
        // Escala pelo nível
        this.setLevel(level);
        
        this.createModel();
        this.createHealthBar();
    }
    
    setLevel(level) {
        const multiplier = 1 + (level - 1) * 0.15;
        this.health = Math.floor(80 * multiplier);
        this.maxHealth = this.health;
        this.attackDamage = Math.floor(15 * multiplier);
        this.moveSpeed = 1.6 + (level - 1) * 0.1;
        this.updateHealthBar?.();
    }
    
    createModel() {
        // Materiais mais escuros e assustadores
        const barkMat = new THREE.MeshStandardMaterial({ 
            color: 0x3a2a1a, 
            roughness: 0.9,
            metalness: 0.1
        });
        
        const darkBarkMat = new THREE.MeshStandardMaterial({ 
            color: 0x2a1a0a, 
            roughness: 0.95
        });
        
        const glowMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffaa, 
            emissive: 0x00aa66,
            emissiveIntensity: 0.8
        });
        
        const eyeMat = new THREE.MeshStandardMaterial({ 
            color: 0xff3300, 
            emissive: 0xff2200,
            emissiveIntensity: 1.2
        });
        
        // CORPO PRINCIPAL (tronco mais grosso)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.8, 8), barkMat);
        body.position.y = 0.9;
        body.castShadow = true;
        this.add(body);
        
        // DETALHES DE CASCAS/CROCAS no corpo
        const barkDetailMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
        for (let i = 0; i < 12; i++) {
            const detail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.1), barkDetailMat);
            detail.position.set(
                (Math.random() - 0.5) * 0.8,
                0.6 + Math.random() * 1.2,
                0.45
            );
            detail.castShadow = true;
            this.add(detail);
        }
        
        // CABEÇA (máscara assustadora)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8), darkBarkMat);
        head.position.y = 1.7;
        head.castShadow = true;
        this.add(head);
        
        // OLHOS BRILHANTES (vermelhos quando ataca)
        this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8), eyeMat);
        this.leftEye.position.set(-0.18, 1.85, 0.45);
        this.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8), eyeMat);
        this.rightEye.position.set(0.18, 1.85, 0.45);
        this.add(this.rightEye);
        
        // CHIFRES DE GALHO (grandes e sinistros)
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x4a2a0a });
        const leftHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.7, 5), hornMat);
        leftHorn.position.set(-0.32, 2.05, 0);
        leftHorn.rotation.z = -0.4;
        leftHorn.rotation.x = 0.2;
        this.add(leftHorn);
        
        const rightHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.7, 5), hornMat);
        rightHorn.position.set(0.32, 2.05, 0);
        rightHorn.rotation.z = 0.4;
        rightHorn.rotation.x = 0.2;
        this.add(rightHorn);
        
        // BRAÇOS (galhos retorcidos e longos)
        const armMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a });
        
        this.leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.1, 5), armMat);
        this.leftArm.position.set(-0.85, 1.3, 0);
        this.leftArm.rotation.z = 0.5;
        this.leftArm.castShadow = true;
        this.add(this.leftArm);
        
        // Garras na mão esquerda
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a });
        for (let i = 0; i < 3; i++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), clawMat);
            claw.position.set(-0.85 + (i - 1) * 0.08, 0.85, 0.25);
            this.add(claw);
        }
        
        this.rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.1, 5), armMat);
        this.rightArm.position.set(0.85, 1.3, 0);
        this.rightArm.rotation.z = -0.5;
        this.rightArm.castShadow = true;
        this.add(this.rightArm);
        
        for (let i = 0; i < 3; i++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), clawMat);
            claw.position.set(0.85 + (i - 1) * 0.08, 0.85, 0.25);
            this.add(claw);
        }
        
        // PARTÍCULAS DE ESPOROS TÓXICOS
        this.spores = [];
        for (let i = 0; i < 30; i++) {
            const spore = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4), glowMat);
            spore.position.set(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 2.2,
                (Math.random() - 0.5) * 1.5
            );
            this.add(spore);
            this.spores.push(spore);
        }
        
        // Luz interna (pulsa quando ataca)
        this.coreLight = new THREE.PointLight(0x00aa66, 0.5, 5);
        this.coreLight.position.set(0, 1.2, 0.3);
        this.add(this.coreLight);
    }
    
    createHealthBar() {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 20;
        this.healthCanvas = canvas;
        this.healthTexture = new THREE.CanvasTexture(canvas);
        
        const barMaterial = new THREE.SpriteMaterial({ map: this.healthTexture });
        this.healthBar = new THREE.Sprite(barMaterial);
        this.healthBar.scale.set(1.8, 0.35, 1);
        this.healthBar.position.y = 2.3;
        this.add(this.healthBar);
        
        this.updateHealthBar();
    }
    
    updateHealthBar() {
        if (!this.healthCanvas) return;
        const ctx = this.healthCanvas.getContext('2d');
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, 0, 120, 20);
        
        const percent = this.health / this.maxHealth;
        ctx.fillStyle = this.isVulnerable ? '#88ff44' : '#44ff88';
        ctx.fillRect(2, 2, 116 * percent, 16);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`🌿 ${Math.floor(this.health)}/${this.maxHealth}`, 30, 15);
        
        this.healthTexture.needsUpdate = true;
    }
    
    applyAntidote() {
        this.antidoteCount++;
        
        if (this.antidoteCount >= 3) {
            this.isVulnerable = true;
            // Fica pálido e mais lento
            this.children.forEach(child => {
                if (child.material && child.material.color) {
                    child.material.color.setHex(0x888888);
                }
            });
            this.moveSpeed = 1.2;
        } else {
            // Efeito de dano visual
            const flash = new THREE.MeshStandardMaterial({ color: 0x88ffaa });
            const effect = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6), flash);
            effect.position.copy(this.position);
            this.parent.add(effect);
            setTimeout(() => this.parent.remove(effect), 200);
        }
    }
    
    takeDamage(amount, source) {
        if (!this.isVulnerable && source !== 'antidote') {
            return; // Imune antes de 3 antídotos
        }
        
        this.health -= amount;
        
        // Flash de dano
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 6),
            new THREE.MeshStandardMaterial({ color: 0xff8888 })
        );
        flash.position.copy(this.position);
        this.parent.add(flash);
        setTimeout(() => this.parent.remove(flash), 100);
        
        this.updateHealthBar();
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    update(deltaTime, playerPosition) {
        // Atualiza cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Distância ao jogador
        const distToPlayer = this.position.distanceTo(playerPosition);
        
        // MÁQUINA DE ESTADOS
        switch(this.state) {
            case 'IDLE':
                if (distToPlayer < this.detectionRange) {
                    this.state = 'CHASING';
                    this.onDetect();
                }
                break;
                
            case 'CHASING':
                if (distToPlayer < this.attackRange && this.attackCooldown <= 0) {
                    this.state = 'ATTACKING';
                    this.attackTimer = 0.5;
                    this.isAttacking = true;
                } else if (distToPlayer > this.detectionRange * 1.5) {
                    this.state = 'IDLE';
                } else {
                    this.chasePlayer(playerPosition, deltaTime);
                }
                break;
                
            case 'ATTACKING':
                this.attackTimer -= deltaTime;
                if (this.attackTimer <= 0) {
                    // Executa ataque
                    if (distToPlayer < this.attackRange) {
                        // Dano será aplicado pelo CombatSystem
                        this.playAttackAnimation();
                    }
                    this.state = 'CHASING';
                    this.attackCooldown = 1.0;
                    this.isAttacking = false;
                }
                break;
        }
        
        // Animações visuais contínuas
        const time = Date.now() * 0.003;
        
        // Flutuação
        this.position.y = Math.sin(time) * 0.08;
        
        // Balanço dos braços
        if (this.state === 'CHASING') {
            this.leftArm.rotation.z = 0.5 + Math.sin(time * 8) * 0.2;
            this.rightArm.rotation.z = -0.5 + Math.cos(time * 8) * 0.2;
        } else {
            this.leftArm.rotation.z = 0.5 + Math.sin(time * 2) * 0.05;
            this.rightArm.rotation.z = -0.5 + Math.cos(time * 2) * 0.05;
        }
        
        // Pulsação dos olhos e luz
        if (this.state === 'ATTACKING') {
            const pulse = 1.5 + Math.sin(time * 20) * 0.8;
            if (this.leftEye.material) this.leftEye.material.emissiveIntensity = pulse;
            if (this.rightEye.material) this.rightEye.material.emissiveIntensity = pulse;
            this.coreLight.intensity = 1.2 + Math.sin(time * 15) * 0.5;
        } else {
            const idlePulse = 0.6 + Math.sin(time * 3) * 0.2;
            if (this.leftEye.material) this.leftEye.material.emissiveIntensity = idlePulse;
            if (this.rightEye.material) this.rightEye.material.emissiveIntensity = idlePulse;
            this.coreLight.intensity = 0.4 + Math.sin(time * 2) * 0.15;
        }
        
        // Anima esporos
        this.spores.forEach((spore, i) => {
            spore.position.y += Math.sin(time * 3 + i) * 0.008;
            spore.position.x += Math.cos(time * 2 + i) * 0.003;
        });
    }
    
    chasePlayer(playerPosition, deltaTime) {
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.position)
            .normalize();
        
        let newX = this.position.x + direction.x * this.moveSpeed * deltaTime;
        let newZ = this.position.z + direction.z * this.moveSpeed * deltaTime;
        
        // Mantém distância mínima (não encosta no player)
        const distAfter = Math.hypot(newX - playerPosition.x, newZ - playerPosition.z);
        if (distAfter > 1.0) {
            this.position.x = newX;
            this.position.z = newZ;
        }
        
        // Rotação para olhar o player
        const angle = Math.atan2(direction.x, direction.z);
        this.rotation.y = angle;
    }
    
    onDetect() {
        // Rugido visual
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x88ffaa, emissive: 0x44aa66 });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.2, 16), ringMat);
        ring.position.copy(this.position);
        ring.position.y = 0.1;
        ring.rotation.x = -Math.PI / 2;
        this.parent.add(ring);
        setTimeout(() => this.parent.remove(ring), 300);
        
        // Olhos brilham forte
        if (this.leftEye.material) this.leftEye.material.emissiveIntensity = 1.5;
        if (this.rightEye.material) this.rightEye.material.emissiveIntensity = 1.5;
    }
    
    playAttackAnimation() {
        // Braço direito avança
        const originalRot = this.rightArm.rotation.z;
        this.rightArm.rotation.z = -1.2;
        setTimeout(() => {
            this.rightArm.rotation.z = originalRot;
            
            // Anel de impacto
            const ringMat = new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0xff4400 });
            const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 1.0, 16), ringMat);
            ring.position.copy(this.position);
            ring.position.y = 0.1;
            ring.rotation.x = -Math.PI / 2;
            this.parent.add(ring);
            setTimeout(() => this.parent.remove(ring), 200);
        }, 150);
    }
    
    die() {
        // Efeito de dissolução
        for (let i = 0; i < 50; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 4),
                new THREE.MeshStandardMaterial({ color: 0x66ffaa, emissive: 0x33aa66 })
            );
            particle.position.copy(this.position);
            particle.position.x += (Math.random() - 0.5) * 1.5;
            particle.position.z += (Math.random() - 0.5) * 1.5;
            this.parent.add(particle);
            
            let y = 0;
            const interval = setInterval(() => {
                particle.position.y += 0.1;
                y += 0.1;
                if (y > 2) {
                    clearInterval(interval);
                    this.parent.remove(particle);
                }
            }, 30);
        }
        
        this.parent.remove(this);
    }
    
    containsMesh(mesh) {
        return this.children.includes(mesh) || mesh.parent === this;
    }
}