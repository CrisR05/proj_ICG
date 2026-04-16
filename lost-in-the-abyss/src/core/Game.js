import * as THREE from 'three';
import { SceneManager } from '../scene/SceneManager.js';
import { Player } from '../entities/Player.js';
import { Dungeon } from '../scene/Dungeon.js';
import { DungeonForest } from '../scene/DungeonForest.js';
import { DungeonMoon } from '../scene/DungeonMoon.js';
import { InputManager } from '../systems/InputManager.js';
import { CollisionSystem } from '../systems/Collision.js';
import { UIManager } from '../systems/UIManager.js';
import { GAME_CONFIG, generateThemes } from '../utils/constants.js';

export class Game {
    constructor() {
        this.timer = new THREE.Timer();
        this.timer.connect(document);
        
        this.state = 'MENU';
        this.totalLevels = 10;
        this.currentLevel = 1;
        this.crystalsCollected = 0;
        this.totalCrystals = 0;
        this.themes = [];
        
        this.sceneManager = new SceneManager();
        this.player = null;
        this.dungeon = null;
        this.normalDungeon = null;
        this.forestDungeon = null;
        this.moonDungeon = null;
        this.input = new InputManager();
        this.collision = new CollisionSystem();
        this.ui = new UIManager();

        // Callbacks do UI
        this.ui.onStartGame = (numLevels) => this.startNewGame(numLevels);
        this.ui.onResume = () => this.resumeGame();
        this.ui.onRestartLevel = () => this.restartLevel();
        this.ui.onExitToMenu = () => this.quitToMenu();
        
        // Mostra menu principal
        this.ui.showMainMenu();
        
        // Tecla ESC para pausa
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.state === 'PLAYING') {
                    this.pauseGame();
                } else if (this.state === 'PAUSED') {
                    this.resumeGame();
                }
            }
        });
    }
    
    startNewGame(totalLevels) {
        console.log("Starting new game with", totalLevels, "levels");
        this.totalLevels = Math.min(totalLevels, 20);
        this.themes = generateThemes(this.totalLevels);
        this.currentLevel = 1;
        this.state = 'PLAYING';
        this.initLevel();
        this.ui.hideMainMenu();
        this.start();
    }
    
    clearScene() {
        // Remove todos os grupos das dungeons da cena
        if (this.normalDungeon) {
            this.normalDungeon.clear();
            if (this.normalDungeon.group) this.sceneManager.scene.remove(this.normalDungeon.group);
            if (this.normalDungeon.pathGroup) this.sceneManager.scene.remove(this.normalDungeon.pathGroup);
            if (this.normalDungeon.greenPathGroup) this.sceneManager.scene.remove(this.normalDungeon.greenPathGroup);
        }
        if (this.forestDungeon) {
            this.forestDungeon.clear();
            if (this.forestDungeon.group) this.sceneManager.scene.remove(this.forestDungeon.group);
            if (this.forestDungeon.pathGroup) this.sceneManager.scene.remove(this.forestDungeon.pathGroup);
            if (this.forestDungeon.greenPathGroup) this.sceneManager.scene.remove(this.forestDungeon.greenPathGroup);
        }
        if (this.moonDungeon) {
            this.moonDungeon.clear();
            if (this.moonDungeon.group) this.sceneManager.scene.remove(this.moonDungeon.group);
            if (this.moonDungeon.pathGroup) this.sceneManager.scene.remove(this.moonDungeon.pathGroup);
            if (this.moonDungeon.greenPathGroup) this.sceneManager.scene.remove(this.moonDungeon.greenPathGroup);
        }
        
        // Recria os grupos das dungeons (limpos)
        if (this.normalDungeon) {
            this.normalDungeon.group = new THREE.Group();
            this.normalDungeon.pathGroup = new THREE.Group();
            this.normalDungeon.greenPathGroup = new THREE.Group();
            this.sceneManager.scene.add(this.normalDungeon.group);
            this.sceneManager.scene.add(this.normalDungeon.pathGroup);
            this.sceneManager.scene.add(this.normalDungeon.greenPathGroup);
        }
        if (this.forestDungeon) {
            this.forestDungeon.group = new THREE.Group();
            this.forestDungeon.pathGroup = new THREE.Group();
            this.forestDungeon.greenPathGroup = new THREE.Group();
            this.sceneManager.scene.add(this.forestDungeon.group);
            this.sceneManager.scene.add(this.forestDungeon.pathGroup);
            this.sceneManager.scene.add(this.forestDungeon.greenPathGroup);
        }
        if (this.moonDungeon) {
            this.moonDungeon.group = new THREE.Group();
            this.moonDungeon.pathGroup = new THREE.Group();
            this.moonDungeon.greenPathGroup = new THREE.Group();
            this.sceneManager.scene.add(this.moonDungeon.group);
            this.sceneManager.scene.add(this.moonDungeon.pathGroup);
            this.sceneManager.scene.add(this.moonDungeon.greenPathGroup);
        }
    }
    
    initLevel() {
        // Limpa o mapa anterior
        this.clearScene();
        
        const theme = this.themes[this.currentLevel - 1];
        this.sceneManager.applyTheme(theme);
        
        // Alternância: Nível 1 = Lua, Nível 2 = Floresta, Nível 3 = Masmorra, repete
        const levelType = (this.currentLevel - 1) % 3;
        
        if (levelType === 0) {
            // LUA (primeiro nível)
            console.log(`🌕 Level ${this.currentLevel}: MOON`);
            if (!this.moonDungeon) {
                this.moonDungeon = new DungeonMoon(this.sceneManager.scene);
            }
            this.dungeon = this.moonDungeon;
        } else if (levelType === 1) {
            // FLORESTA
            console.log(`🌲 Level ${this.currentLevel}: FOREST`);
            if (!this.forestDungeon) {
                this.forestDungeon = new DungeonForest(this.sceneManager.scene);
            }
            this.dungeon = this.forestDungeon;
        } else {
            // MASMORRA
            console.log(`🏰 Level ${this.currentLevel}: DUNGEON`);
            if (!this.normalDungeon) {
                this.normalDungeon = new Dungeon(this.sceneManager.scene);
            }
            this.dungeon = this.normalDungeon;
        }
        
        this.dungeon.generate(this.currentLevel, theme);
        
        if (!this.player) {
            this.player = new Player(this.sceneManager.camera, this.sceneManager.scene);
        }
        const startPos = this.dungeon.getStartPosition();
        this.player.setPosition(startPos.x, startPos.y, startPos.z);
        this.player.setFlashlightColor(theme.flashlightColor);
        this.player.energy = 1.0;
        const drainBonus = (this.currentLevel - 1) * 0.002;
        this.player.drainRate = GAME_CONFIG.BASE_ENERGY_DRAIN + drainBonus;
        this.player.intensityMultiplier = 1.0;
        
        this.crystalsCollected = 0;
        this.totalCrystals = theme.totalCrystals;
        
        this.ui.updateLevel(this.currentLevel, theme.name);
        this.ui.updateCrystals(0, this.totalCrystals);
        this.ui.updateEnergy(1.0);
        this.ui.showMessage(`LEVEL ${this.currentLevel}`, 2000);
    }
    
    start() {
        this.timer.update();
        this.animate();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.timer.update();
        const deltaTime = Math.min(this.timer.getDelta(), 0.1);
        
        if (this.state === 'PLAYING') {
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
            
            // Cristais
            const crystals = this.dungeon.getCrystals();
            crystals.forEach(crystal => {
                crystal.update(deltaTime);
                if (!crystal.collected) {
                    const dist = this.player.position.distanceTo(crystal.mesh.position);
                    if (dist < GAME_CONFIG.CRYSTAL_COLLECT_DISTANCE) {
                        crystal.collected = true;
                        crystal.mesh.visible = false;
                        this.crystalsCollected++;
                        this.player.recharge(0.25, true);
                        this.player.setFlashlightColor(crystal.color);
                        this.ui.updateCrystals(this.crystalsCollected, this.totalCrystals);
                        this.ui.showMessage(`CRYSTAL! +25% ENERGY`, 1000);
                        if (this.crystalsCollected >= this.totalCrystals) {
                            const portal = this.dungeon.getPortal();
                            if (portal && portal.activate) {
                                portal.activate();
                            } else if (portal && portal.isActive !== undefined) {
                                portal.isActive = true;
                            }
                            this.ui.showMessage(`PORTAL OPENED!`, 3000);
                        }
                    }
                }
            });
            
            // Portal
            const portal = this.dungeon.getPortal();
            if (portal) {
                if (portal.update) portal.update(deltaTime);
                
                const isActive = portal.isActive || (portal.mesh && portal.userData?.isActive);
                if (isActive) {
                    const portalPos = portal.position || portal.mesh?.position;
                    if (portalPos) {
                        const dist = this.player.position.distanceTo(portalPos);
                        if (dist < GAME_CONFIG.PORTAL_ACTIVATE_DISTANCE) {
                            this.nextLevel();
                        }
                    }
                }
            }
            
            this.ui.updateEnergy(this.player.energy);
            
            if (this.player.energy <= 0) {
                this.ui.showMessage(`LANTERN DIED...`, 0);
                this.state = 'GAMEOVER';
                setTimeout(() => this.resetGame(), 2000);
            }
            
            if (this.dungeon.updatePath) {
                this.dungeon.updatePath(this.player.position);
            }
        }
        
        this.sceneManager.render();
    }
    
    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel > this.totalLevels) {
            this.ui.showMessage(`🏆 VICTORY! YOU ESCAPED THE ABYSS! 🏆`, 5000);
            this.state = 'VICTORY';
            setTimeout(() => this.quitToMenu(), 5000);
            return;
        }
        this.initLevel();
    }
    
    resetGame() {
        this.state = 'MENU';
        this.ui.showMainMenu();
    }
    
    pauseGame() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.ui.showPauseMenu();
        }
    }
    
    resumeGame() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.ui.hidePauseMenu();
        }
    }
    
    restartLevel() {
        this.initLevel();
        if (this.state === 'PAUSED') {
            this.resumeGame();
        }
    }
    
    quitToMenu() {
        this.state = 'MENU';
        this.ui.showMainMenu();
        
        // Limpar tudo ao sair para o menu
        this.clearScene();
        
        this.normalDungeon = null;
        this.forestDungeon = null;
        this.moonDungeon = null;
        this.dungeon = null;
    }
}