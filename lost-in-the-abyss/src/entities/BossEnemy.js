// src/entities/BossEnemy.js
import * as THREE from 'three';

export class BossEnemy extends THREE.Group {
    constructor(x, z, scale = 1.8) {
        super();
        this.position.set(x, 0, z);
        this.scale.set(scale, scale, scale);
        
        // Status
        this.health = 100;
        this.maxHealth = 100;
        this.type = 'boss';
        
        // Estados
        this.state = 'IDLE'; // IDLE, CHASING, ATTACKING, STUNNED
        this.stateTimer = 0;
        
        // Combate
        this.attackCooldown = 0;
        this.attackDamage = 15;
        this.attackRange = 2.5;
        this.detectionRange = 12;
        this.moveSpeed = 2.0;
        
        // Colisão (evita atravessar o player)
        this.collisionRadius = 0.8 * scale;
        
        // Dificuldade (vem do nível)
        this.level = 1;
    }
    
    setLevel(level) {
        this.level = level;
        // Aumenta stats baseado no nível
        const multiplier = 1 + (level - 1) * 0.15;
        this.health = Math.floor(100 * multiplier);
        this.maxHealth = this.health;
        this.attackDamage = Math.floor(15 * multiplier);
        this.moveSpeed = 1.8 + (level - 1) * 0.15;
        this.updateHealthBar?.();
    }
    
    takeDamage(amount, source) {
        this.health -= amount;
        this.showHitEffect();
        this.updateHealthBar?.();
        
        if (this.health <= 0) this.die();
    }
    
    showHitEffect() {
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 6),
            new THREE.MeshStandardMaterial({ color: 0xff8888 })
        );
        flash.position.copy(this.position);
        this.parent.add(flash);
        setTimeout(() => this.parent.remove(flash), 100);
    }
    
    update(deltaTime, playerPosition) {
        // Atualiza cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
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
                if (distToPlayer < this.attackRange) {
                    this.state = 'ATTACKING';
                    this.stateTimer = 0.5;
                } else if (distToPlayer > this.detectionRange * 1.5) {
                    this.state = 'IDLE';
                } else {
                    this.chasePlayer(playerPosition, deltaTime);
                }
                break;
                
            case 'ATTACKING':
                this.stateTimer -= deltaTime;
                if (this.stateTimer <= 0) {
                    // Executa o ataque
                    const damage = this.executeAttack(playerPosition);
                    this.state = 'CHASING';
                    this.attackCooldown = 1.2;
                    if (damage > 0) return damage;
                }
                break;
        }
        
        return 0;
    }
    
    chasePlayer(playerPosition, deltaTime) {
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.position)
            .normalize();
        
        let newX = this.position.x + direction.x * this.moveSpeed * deltaTime;
        let newZ = this.position.z + direction.z * this.moveSpeed * deltaTime;
        
        // PREVINE COLISÃO - mantém distância mínima
        const distToPlayerAfter = Math.hypot(newX - playerPosition.x, newZ - playerPosition.z);
        if (distToPlayerAfter > 1.2) {  // Não encosta no player
            this.position.x = newX;
            this.position.z = newZ;
        }
        
        // Rotação para olhar o player
        const angle = Math.atan2(direction.x, direction.z);
        this.rotation.y = angle;
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
        // Override nas subclasses
    }
    
    onDetect() {
        // Override nas subclasses
    }
    
    die() {
        this.parent.remove(this);
    }
}