// src/systems/CombatSystem.js
import * as THREE from 'three';

export class CombatSystem {
    constructor(scene, player, uiManager) {
        this.scene = scene;
        this.player = player;
        this.ui = uiManager;
        
        // Adicionar direção do jogador
        this.playerDirection = new THREE.Vector3(0, 0, -1);
        
        // Estado do combate
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.equippedItem = null;
        
        // Inventário específico
        this.pickaxe = null;
        this.antidotes = 0;
        this.energyCrystals = 0;
        this.totemsActivated = 0;
        
        // Inimigos ativos
        this.enemies = [];
        this.hasSpawnedEnemies = true;
        
        // Raycaster para ataques
        this.raycaster = new THREE.Raycaster();
    }
    
    // ADICIONAR ESTE MÉTODO
    updatePlayerDirection(direction) {
        if (direction) {
            this.playerDirection = direction.clone();
        }
    }
    
    addEnemy(enemy) {
        this.enemies.push(enemy);
    }
    
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) this.enemies.splice(index, 1);
    }
    
    getEnemyCount() {
        return this.enemies.length;
    }
    
    clear() {
        this.enemies.forEach(enemy => {
            if (enemy.parent) enemy.parent.remove(enemy);
        });
        this.enemies = [];
    }
    
    // No CombatSystem.js, substitua o método updateEnemies:

    updateEnemies(deltaTime, playerPosition) {
        let totalDamage = 0;
        
        this.enemies.forEach(enemy => {
            if (enemy.update) {
                const damage = enemy.update(deltaTime, playerPosition);
                
                // Se o inimigo está atacando, causa dano
                if (enemy.isAttacking && damage === undefined) {
                    totalDamage += enemy.attackDamage || 15;
                    enemy.isAttacking = false;
                } else if (typeof damage === 'number' && damage > 0) {
                    totalDamage += damage;
                }
            }
        });
        
        if (totalDamage > 0) {
            this.damagePlayer(totalDamage);
        }
    }
    
    update(deltaTime, input) {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Ataque corpo a corpo (Espaço)
        if (input.attack && this.attackCooldown <= 0) {
            this.meleeAttack();
            this.attackCooldown = 0.5;
        }
        
        // Usar item equipado (E)
        if (input.useItem && this.attackCooldown <= 0) {
            this.useEquippedItem();
            this.attackCooldown = 0.3;
        }
        
        // Trocar item (1, 2, 3)
        if (input.item1) this.equippedItem = 'pickaxe';
        if (input.item2) this.equippedItem = 'antidote';
        if (input.item3) this.equippedItem = 'crystal';
        
        this.updateUI();
    }
    
    meleeAttack() {
        if (!this.player) return;
        
        const origin = this.player.position.clone();
        const direction = this.playerDirection.clone();
        
        this.raycaster.set(origin, direction);
        
        for (const enemy of this.enemies) {
            const hits = this.raycaster.intersectObject(enemy, true);
            if (hits.length > 0 && hits[0].distance < 2.5) {
                enemy.takeDamage(25, 'melee');
                this.createHitEffect(hits[0].point);
                break;
            }
        }
    }
    
    useEquippedItem() {
        switch(this.equippedItem) {
            case 'pickaxe':
                this.usePickaxe();
                break;
            case 'antidote':
                this.useAntidote();
                break;
            case 'crystal':
                this.useCrystal();
                break;
        }
    }
    
    usePickaxe() {
        if (!this.pickaxe) {
            if (this.ui) this.ui.showMessage('No pickaxe! Find it in the dungeon!', 1500);
            return;
        }
        
        if (!this.player) return;
        
        const origin = this.player.position.clone();
        const direction = this.playerDirection.clone();
        
        this.raycaster.set(origin, direction);
        
        for (const enemy of this.enemies) {
            const hits = this.raycaster.intersectObject(enemy, true);
            if (hits.length > 0 && hits[0].distance < 2.5) {
                const isBackstab = this.isBehind(enemy, hits[0].point);
                if (isBackstab && !enemy.isAlerted && enemy.type === 'golem') {
                    enemy.die();
                    if (this.ui) this.ui.showMessage('⚡ BACKSTAB! Golem destroyed!', 2000);
                } else {
                    enemy.takeDamage(15, 'pickaxe');
                    if (enemy.alert) enemy.alert();
                }
                this.createHitEffect(hits[0].point);
                break;
            }
        }
    }
    // Adicione este método à classe CombatSystem
// Adicione este método
damagePlayer(amount) {
    if (this.player) {
        // Reduz energia
        this.player.energy = Math.max(0, this.player.energy - amount / 100);
        this.ui.showMessage(`💔 TOOK ${amount} DAMAGE!`, 1000);
        
        // Efeito de dano na UI
        if (this.ui.showDamageFlash) {
            this.ui.showDamageFlash();
        }
    }
}

// Modifique o updateEnemies existente
updateEnemies(deltaTime, playerPosition) {
    let totalDamage = 0;
    
    this.enemies.forEach(enemy => {
        if (enemy.update) {
            const oldHealth = enemy.health;
            const damage = enemy.update(deltaTime, playerPosition);
            
            // Se o inimigo está atacando, causa dano
            if (enemy.isAttacking) {
                totalDamage += enemy.attackDamage || 15;
                enemy.isAttacking = false;
            }
        }
    });
    
    if (totalDamage > 0) {
        this.damagePlayer(totalDamage);
    }
}
    
    useAntidote() {
        if (this.antidotes <= 0) {
            if (this.ui) this.ui.showMessage('No antidotes! Find purple mushrooms!', 1500);
            return;
        }
        
        if (!this.player) return;
        
        const origin = this.player.position.clone();
        const direction = this.playerDirection.clone();
        
        this.raycaster.set(origin, direction);
        
        for (const enemy of this.enemies) {
            const hits = this.raycaster.intersectObject(enemy, true);
            if (hits.length > 0 && hits[0].distance < 3) {
                this.antidotes--;
                if (enemy.applyAntidote) {
                    enemy.applyAntidote();
                } else {
                    enemy.takeDamage(33, 'antidote');
                }
                
                if (enemy.antidoteCount >= 3 || enemy.health <= 0) {
                    if (enemy.health > 0) enemy.die();
                    if (this.ui) this.ui.showMessage('💀 Spirit purified!', 2000);
                } else {
                    if (this.ui) this.ui.showMessage(`Antidote applied! ${3 - (enemy.antidoteCount || 1)} more needed`, 1500);
                }
                this.createHitEffect(hits[0].point);
                break;
            }
        }
    }
    
    useCrystal() {
        if (this.energyCrystals <= 0) {
            if (this.ui) this.ui.showMessage('No energy crystals! Find them on the moon!', 1500);
            return;
        }
        
        if (!this.player) return;
        
        const origin = this.player.position.clone();
        const direction = this.playerDirection.clone();
        
        this.raycaster.set(origin, direction);
        
        for (const enemy of this.enemies) {
            const hits = this.raycaster.intersectObject(enemy, true);
            if (hits.length > 0 && hits[0].distance < 4) {
                this.energyCrystals--;
                enemy.takeDamage(40, 'crystal');
                this.createLightningEffect(hits[0].point);
                
                if (enemy.health <= 0) {
                    if (this.ui) this.ui.showMessage('⚡ Lurker electrocuted!', 2000);
                }
                break;
            }
        }
    }
    
    isBehind(enemy, hitPoint) {
        if (!enemy.position) return false;
        const toEnemy = enemy.position.clone().sub(this.player.position).normalize();
        const enemyForward = new THREE.Vector3(0, 0, 1);
        enemyForward.applyQuaternion(enemy.quaternion);
        const dot = toEnemy.dot(enemyForward);
        return dot < -0.3;
    }
    
    createHitEffect(position) {
        const geometry = new THREE.SphereGeometry(0.1, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const effect = new THREE.Mesh(geometry, material);
        effect.position.copy(position);
        this.scene.add(effect);
        setTimeout(() => this.scene.remove(effect), 200);
    }
    
    createLightningEffect(position) {
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 3);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const bolt = new THREE.Mesh(geometry, material);
            bolt.position.copy(position);
            bolt.position.x += (Math.random() - 0.5) * 0.5;
            bolt.position.z += (Math.random() - 0.5) * 0.5;
            this.scene.add(bolt);
            setTimeout(() => this.scene.remove(bolt), 100);
        }
    }
    
    updateUI() {
        if (this.ui && this.ui.updateInventory) {
            this.ui.updateInventory({
                pickaxe: this.pickaxe ? true : false,
                antidotes: this.antidotes,
                crystals: this.energyCrystals,
                equipped: this.equippedItem
            });
        }
    }
    
    collectPickaxe(position) {
        this.pickaxe = true;
        if (this.ui) this.ui.showMessage('⛏️ Pickaxe acquired! Can now backstab Golems!', 3000);
    }
    
    collectAntidote(position) {
        this.antidotes++;
        if (this.ui) this.ui.showMessage(`🍄 Antidote collected! (${this.antidotes})`, 1500);
    }
    
    collectCrystal(position) {
        this.energyCrystals++;
        if (this.ui) this.ui.showMessage(`💎 Energy Crystal collected! (${this.energyCrystals})`, 1500);
    }
}