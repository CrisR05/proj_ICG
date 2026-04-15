import * as THREE from 'three';
import { SceneManager } from '../scene/SceneManager.js';
import { Player } from '../entities/Player.js';
import { Dungeon } from '../scene/Dungeon.js';
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
        this.ui.hideMainMenu();  // Esconde o menu e mostra a UI do jogo
        this.start();
    }
    
    initLevel() {
        const theme = this.themes[this.currentLevel - 1];
        this.sceneManager.applyTheme(theme);
        
        if (!this.dungeon) {
            this.dungeon = new Dungeon(this.sceneManager.scene);
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
        this.ui.updateEnergy(1.0);  // mostra energia a 100%
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
                            if (portal) portal.activate();
                            this.ui.showMessage(`PORTAL OPENED!`, 3000);
                        }
                    }
                }
            });
            
            // Portal
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
            
            // Atualiza UI da energia
            this.ui.updateEnergy(this.player.energy);
            
            // Game over
            if (this.player.energy <= 0) {
                this.ui.showMessage(`LANTERN DIED...`, 0);
                this.state = 'GAMEOVER';
                setTimeout(() => this.resetGame(), 2000);
            }
            
            // Caminho (debug)
            this.dungeon.updatePath(this.player.position);
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
        // Opcional: limpar cena
        if (this.dungeon) {
            // A dungeon será recriada no próximo jogo
        }
    }
}