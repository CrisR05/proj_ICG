import * as THREE from 'three';
import { SceneManager } from '../scene/SceneManager.js';
import { Player } from '../entities/Player.js';
import { Dungeon } from '../scene/Dungeon.js';
import { InputManager } from '../systems/InputManager.js';
import { CollisionSystem } from '../systems/Collision.js';
import { UIManager } from '../systems/UIManager.js';
import { GAME_CONFIG, LEVEL_THEMES } from '../utils/constants.js';

export class Game {
    constructor() {
        this.timer = new THREE.Timer();
        this.timer.connect(document);
        
        this.state = GAME_CONFIG.STATES.PLAYING;
        
        this.sceneManager = new SceneManager();
        this.player = new Player(this.sceneManager.camera, this.sceneManager.scene);
        this.dungeon = new Dungeon(this.sceneManager.scene);
        this.input = new InputManager();
        this.collision = new CollisionSystem();
        this.ui = new UIManager();
        
        this.currentLevel = 1;
        this.crystalsCollected = 0;
        this.totalCrystals = 0;
        
        this.initLevel();
    }
    
    initLevel() {
        const theme = LEVEL_THEMES[this.currentLevel - 1];
        this.sceneManager.applyTheme(theme);
        this.dungeon.generate(this.currentLevel, theme);
        
        const startPos = this.dungeon.getStartPosition();
        this.player.setPosition(startPos.x, startPos.y, startPos.z);
        this.player.setFlashlightColor(theme.flashlightColor);
        this.player.energy = 1.0;
        this.player.drainRate = GAME_CONFIG.BASE_ENERGY_DRAIN + (this.currentLevel - 1) * 0.005;
        
        // Reinicia o multiplicador de intensidade ao iniciar o nível
        this.player.intensityMultiplier = 1.0;
        
        this.crystalsCollected = 0;
        this.totalCrystals = theme.totalCrystals;
        
        this.ui.updateLevel(this.currentLevel, theme.name);
        this.ui.updateCrystals(0, this.totalCrystals);
        this.ui.showMessage(`NÍVEL ${this.currentLevel}`, 2000);
    }
    
    start() {
        this.timer.update();
        this.animate();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.timer.update();
        const deltaTime = Math.min(this.timer.getDelta(), 0.1);
        
        if (this.state === GAME_CONFIG.STATES.PLAYING) {
            this.input.update();
            
            const collisionCheck = (delta) => {
                return this.collision.checkCollision(
                    this.player.position, 
                    delta.clone().normalize(), 
                    delta.length() + 0.5, 
                    this.dungeon.getWalls()
                );
            };
            
            this.player.update(deltaTime, this.input.keys, collisionCheck);
            
            const crystals = this.dungeon.getCrystals();
            crystals.forEach(crystal => {
                crystal.update(deltaTime);
                
                if (!crystal.collected) {
                    const dist = this.player.position.distanceTo(crystal.mesh.position);
                    if (dist < GAME_CONFIG.CRYSTAL_COLLECT_DISTANCE) {
                        crystal.collected = true;
                        crystal.mesh.visible = false;
                        
                        this.crystalsCollected++;
                        // ⭐ RECARGA COM FLAG "true" PARA AUMENTAR INTENSIDADE
                        this.player.recharge(0.25, true);
                        this.player.setFlashlightColor(crystal.color);
                        
                        this.ui.updateCrystals(this.crystalsCollected, this.totalCrystals);
                        this.ui.showMessage(`💎 CRISTAL! +25% ENERGIA`, 1000);
                        
                        if (this.crystalsCollected >= this.totalCrystals) {
                            const portal = this.dungeon.getPortal();
                            if (portal) {
                                portal.activate();
                                this.ui.showMessage(`🌟 PORTAL ABERTO! 🌟`, 3000);
                            }
                        }
                    }
                }
            });
            
            const portal = this.dungeon.getPortal();
            if (portal) {
                portal.update(deltaTime);
                if (portal.isActive) {
                    const dist = this.player.position.distanceTo(portal.mesh.position);
                    if (dist < GAME_CONFIG.PORTAL_ACTIVATE_DISTANCE) {
                        this.nextLevel();
                    }
                }
            }
            
            this.ui.updateEnergy(this.player.energy);
            
            if (this.player.energy <= 0) {
                this.ui.showMessage(`💀 A LANTERNA APAGOU... 💀`, 0);
                this.state = 'gameover';
                setTimeout(() => this.resetLevel(), 2000);
            }
        }
        
        // ⭐ ATUALIZA O CAMINHO VERMELHO PARA O CRISTAL MAIS PRÓXIMO
        this.dungeon.updatePath(this.player.position);
        
        this.sceneManager.render();
    }
    
    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel > LEVEL_THEMES.length) {
            this.ui.showMessage(`🏆 VITÓRIA! ESCAPASTE DO ABISMO! 🏆`, 5000);
            this.state = 'victory';
            return;
        }
        this.initLevel();
    }
    
    resetLevel() {
        this.state = GAME_CONFIG.STATES.PLAYING;
        this.initLevel();
    }
}