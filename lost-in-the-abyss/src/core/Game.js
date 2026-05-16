import * as THREE from 'three';
import { SceneManager } from '../scene/SceneManager.js';
import { Player } from '../entities/Player.js';
import { Dungeon } from '../scene/Dungeon.js';
import { DungeonForest } from '../scene/DungeonForest.js';
import { DungeonMoon } from '../scene/DungeonMoon.js';
import { InputManager } from '../systems/InputManager.js';
import { CollisionSystem } from '../systems/Collision.js';
import { UIManager } from '../systems/UIManager.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { GAME_CONFIG, generateThemes } from '../utils/constants.js';

export class Game {
    constructor() {
        this.timer = new THREE.Timer();
        this.timer.connect(document);
        this.mushrooms = [];
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
        this.combat = null; // Sistema de combate

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
        
        // Inicia o loop de animação
        this.animate();
    }
    
    startNewGame(totalLevels) {
        console.log("Starting new game with", totalLevels, "levels");
        this.totalLevels = Math.min(totalLevels, 20);
        this.themes = generateThemes(this.totalLevels);
        this.currentLevel = 1;
        this.state = 'PLAYING';
        this.initLevel();
        this.ui.hideMainMenu();
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
        
        // Limpa inimigos do sistema de combate
        if (this.combat) {
            this.combat.clear();
        }
    }
    
    initLevel() {
        // Limpa o mapa anterior
        this.clearScene();
        
        const theme = this.themes[this.currentLevel - 1];
        this.sceneManager.applyTheme(theme);
        this.bossDefeated = false;  // <-- ADICIONE ESTA LINHA

        // Alternância: Nível 1 = Floresta, Nível 2 = Lua, Nível 3 = Masmorra, repete
        const levelType = (this.currentLevel - 1) % 3;
        
        if (levelType === 0) {
            // FLORESTA (primeiro nível)
            console.log(`🌲 Level ${this.currentLevel}: FOREST`);
            if (!this.forestDungeon) {
                this.forestDungeon = new DungeonForest(this.sceneManager.scene);
            }
            this.dungeon = this.forestDungeon;
        } else if (levelType === 1) {
            // LUA
            console.log(`🌕 Level ${this.currentLevel}: MOON`);
            if (!this.moonDungeon) {
                this.moonDungeon = new DungeonMoon(this.sceneManager.scene);
            }
            this.dungeon = this.moonDungeon;
        } else {
            // MASMORRA
            console.log(`🏰 Level ${this.currentLevel}: DUNGEON`);
            if (!this.normalDungeon) {
                this.normalDungeon = new Dungeon(this.sceneManager.scene);
            }
            this.dungeon = this.normalDungeon;
        }
        
        this.dungeon.generate(this.currentLevel, theme);
        
        // Cria o jogador se não existir
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
        
        // Inicializa sistema de combate
        if (!this.combat) {
            this.combat = new CombatSystem(this.sceneManager.scene, this.player, this.ui);
        }
        
        // Adiciona inimigos baseado no tipo de nível
        this.spawnEnemiesForLevel(levelType);
        
        // Adiciona itens coletáveis específicos do nível
        this.spawnCollectablesForLevel(levelType);
        
        this.ui.updateLevel(this.currentLevel, theme.name);
        this.ui.updateCrystals(0, this.totalCrystals);
        this.ui.updateEnergy(1.0);
        this.ui.showMessage(`LEVEL ${this.currentLevel}`, 2000);
    }
    
    // No método spawnEnemiesForLevel, mude para SPAWN APENAS 1 CHEFE
spawnEnemiesForLevel(levelType) {
    // Limpa inimigos anteriores
    this.combat.clear();
    
    // Nível de dificuldade baseado no level atual
    const levelMultiplier = 1 + (this.currentLevel - 1) * 0.15;
    
    if (levelType === 2) { // Masmorra - Stone Golem
        console.log("👹 Spawning Stone Golem...");
        import('../entities/StoneGolem.js').then(module => {
            const StoneGolem = module.StoneGolem;
            // Apenas UM golem, mais forte conforme o nível
            const golem = new StoneGolem(0, 0);
            // Aumenta stats baseado no nível
            golem.maxHealth = Math.floor(100 * levelMultiplier);
            golem.health = golem.maxHealth;
            golem.attackDamage = Math.floor(15 * levelMultiplier);
            golem.moveSpeed = 1.5 + (this.currentLevel - 1) * 0.1;
            
            this.sceneManager.scene.add(golem);
            this.combat.addEnemy(golem);
            this.ui.showMessage(`👹 STONE GOLEM (Lv.${Math.floor(levelMultiplier * 10)}) blocks the way!`, 3000);
        }).catch(err => console.warn("StoneGolem error", err));
    } 
    else if (levelType === 0) { // Floresta - Forest Spirit
    console.log("🌿 Spawning Forest Spirit...");
    import('../entities/ForestSpirit.js').then(module => {
        const ForestSpirit = module.ForestSpirit;
        
        // ENCONTRA UMA POSIÇÃO DISTANTE DO JOGADOR
        // O mapa da floresta tem tamanho variável, vamos usar uma posição fixa distante
        // O spawn padrão do jogador é (0, 0), então vamos colocar o chefe longe
        
        let spawnX = 0, spawnZ = 0;
        
        // Tenta encontrar uma posição longe do centro
        if (this.dungeon && this.dungeon.getWalls) {
            // Procura uma parede/área distante - simplificado: usa coordenadas baseadas no tamanho do mapa
            const theme = this.themes[this.currentLevel - 1];
            const mapSize = theme.mapSize;
            const offset = (mapSize * 4) / 2; // tileSize = 4
            
            // Posiciona num dos cantos opostos ao centro
            const quadrants = [
                { x: offset - 8, z: offset - 8 },   // canto inferior direito
                { x: -offset + 8, z: offset - 8 },  // canto inferior esquerdo
                { x: offset - 8, z: -offset + 8 },  // canto superior direito
                { x: -offset + 8, z: -offset + 8 }  // canto superior esquerdo
            ];
            const chosen = quadrants[Math.floor(Math.random() * quadrants.length)];
            spawnX = chosen.x;
            spawnZ = chosen.z;
        } else {
            // Fallback: posição distante fixa
            spawnX = 25;
            spawnZ = 25;
        }
        
        const spirit = new ForestSpirit(spawnX, spawnZ, this.currentLevel);
        spirit.maxHealth = Math.floor(80 * (1 + (this.currentLevel - 1) * 0.15));
        spirit.health = spirit.maxHealth;
        
        this.sceneManager.scene.add(spirit);
        this.combat.addEnemy(spirit);
        this.ui.showMessage(`🌿 FOREST SPIRIT (Lv.${this.currentLevel}) haunts the forest!`, 3000);
        this.ui.showMessage(`⚠️ Find 3 antidote mushrooms to weaken it!`, 4000);
    }).catch(err => console.warn("ForestSpirit error", err));
}
    else if (levelType === 1) { // Lua - Moon Lurker
        console.log("👽 Spawning Moon Lurker...");
        import('../entities/MoonLurker.js').then(module => {
            const MoonLurker = module.MoonLurker;
            // Apenas UM lurker, mais forte
            const lurker = new MoonLurker(0, 0);
            lurker.maxHealth = Math.floor(90 * levelMultiplier);
            lurker.health = lurker.maxHealth;
            lurker.attackDamage = Math.floor(18 * levelMultiplier);
            lurker.moveSpeed = 2.5;
            
            this.sceneManager.scene.add(lurker);
            this.combat.addEnemy(lurker);
            this.ui.showMessage(`👽 MOON LURKER (Lv.${Math.floor(levelMultiplier * 9)}) stalks the shadows!`, 3000);
        }).catch(err => console.warn("MoonLurker error", err));
    }
}
    
    spawnCollectablesForLevel(levelType) {
        if (levelType === 2) { // Masmorra - Picareta
            import('../entities/CollectableItem.js').then(module => {
                const PickaxeItem = module.PickaxeItem;
                const pickaxe = new PickaxeItem(3, 4);
                this.sceneManager.scene.add(pickaxe);
                
                // Detecção de coleta
                const checkPickaxe = setInterval(() => {
                    if (this.player && pickaxe) {
                        const dist = this.player.position.distanceTo(pickaxe.position);
                        if (dist < 2.5) {
                            this.combat.collectPickaxe(pickaxe.position);
                            this.sceneManager.scene.remove(pickaxe);
                            clearInterval(checkPickaxe);
                        }
                    }
                }, 100);
            }).catch(err => console.warn("PickaxeItem not loaded yet", err));
        }
      else if (levelType === 0) { // Floresta - Cogumelos Antídoto
    import('../entities/CollectableItem.js').then(module => {
        const AntidoteMushroom = module.AntidoteMushroom;
        
        // Limpa cogumelos anteriores
        this.mushrooms = [];
        
        // POSIÇÕES MAIS PRÓXIMAS E VISÍVEIS (dentro do labirinto)
        const mushroomPositions = [
            // Posições próximas ao centro (fáceis de encontrar)
            { x: -6, z: -5 }, 
            { x: 7, z: -4 }, 
            { x: -5, z: 8 }, 
            { x: 6, z: 7 },
            { x: -8, z: 3 }, 
            { x: 4, z: -7 },
            { x: -3, z: -8 }, 
            { x: 9, z: 5 },
            { x: -7, z: -7 }, 
            { x: 8, z: 8 }
        ];
        
        // Embaralha e pega 6
        const shuffled = [...mushroomPositions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const selectedPositions = shuffled.slice(0, 6);
        
        selectedPositions.forEach(pos => {
            const mushroom = new AntidoteMushroom(pos.x, pos.z);
            this.sceneManager.scene.add(mushroom);
            this.mushrooms.push(mushroom);
            
            // LUZ TEMPORÁRIA PARA DESTAQUE (ajuda a ver)
            const markerLight = new THREE.PointLight(0xff3300, 1.2, 6);
            markerLight.position.set(pos.x, 1.5, pos.z);
            this.sceneManager.scene.add(markerLight);
            
            // Remove a luz temporária após 3 segundos
            setTimeout(() => {
                if (markerLight.parent) this.sceneManager.scene.remove(markerLight);
            }, 3000);
            
            // Loop de update do cogumelo
            const updateMushroom = () => {
                if (mushroom.update && !mushroom.collected && this.state === 'PLAYING') {
                    mushroom.update(0.016);
                    requestAnimationFrame(updateMushroom);
                }
            };
            requestAnimationFrame(updateMushroom);
            
            // Verifica coleta
            const checkMushroom = setInterval(() => {
                if (this.player && mushroom && !mushroom.collected) {
                    const dist = this.player.position.distanceTo(mushroom.position);
                    if (dist < 2.5) {
                        mushroom.collected = true;
                        this.combat.collectAntidote(mushroom.position);
                        this.sceneManager.scene.remove(mushroom);
                        clearInterval(checkMushroom);
                        
                        const index = this.mushrooms.indexOf(mushroom);
                        if (index > -1) this.mushrooms.splice(index, 1);
                        
                        const remaining = 3 - this.combat.antidotes;
                        if (remaining > 0) {
                            this.ui.showMessage(`🍄 ANTIDOTE! (${this.combat.antidotes}/3) ${remaining} more needed`, 2000);
                        } else {
                            this.ui.showMessage(`🍄 ALL ANTIDOTES COLLECTED! Spirit is now VULNERABLE!`, 3000);
                        }
                    }
                }
            }, 100);
        });
        
        // PASSA OS COGUMELOS PARA A DUNGEON (para o caminho funcionar)
        if (this.dungeon && this.dungeon.setMushrooms) {
            this.dungeon.setMushrooms(this.mushrooms);
        }
        // Dentro de spawnCollectablesForLevel, após criar os cogumelos, adicione:
console.log("🔴 VERIFICANDO COGUMELOS:");
this.mushrooms.forEach((m, i) => {
    console.log(`  Cogumelo ${i}: posição (${m.position.x}, ${m.position.z})`);
    // Adiciona uma esfera vermelha gigante como marcador temporário
    const debugSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 })
    );
    debugSphere.position.copy(m.position);
    debugSphere.position.y = 2;
    this.sceneManager.scene.add(debugSphere);
    setTimeout(() => this.sceneManager.scene.remove(debugSphere), 5000);
});
        
        this.ui.showMessage("🔴 Follow the RED PATH to find Antidote Mushrooms! (3 needed)", 5000);
        
        // LOG PARA DEBUG - ver onde estão os cogumelos
        console.log("🍄 COGUMELOS SPAWNADOS:");
        selectedPositions.forEach(pos => {
            console.log(`   → x: ${pos.x}, z: ${pos.z}`);
        });
    }).catch(err => console.warn("AntidoteMushroom error", err));
}

        else if (levelType === 1) { // Lua - Cristais de Energia
            import('../entities/CollectableItem.js').then(module => {
                const EnergyCrystal = module.EnergyCrystal;
                const crystalPositions = [
                    { x: -5, z: -4 }, { x: 4, z: -3 },
                    { x: -3, z: 6 }, { x: 6, z: 5 },
                    { x: -6, z: 3 }, { x: 3, z: -5 }
                ];
                crystalPositions.forEach(pos => {
                    const crystal = new EnergyCrystal(pos.x, pos.z);
                    this.sceneManager.scene.add(crystal);
                    
                    const checkCrystal = setInterval(() => {
                        if (this.player && crystal) {
                            const dist = this.player.position.distanceTo(crystal.position);
                            if (dist < 2.0) {
                                this.combat.collectCrystal(crystal.position);
                                this.sceneManager.scene.remove(crystal);
                                clearInterval(checkCrystal);
                            }
                        }
                    }, 100);
                });
            }).catch(err => console.warn("EnergyCrystal not loaded yet", err));
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.timer.update();
        const deltaTime = Math.min(this.timer.getDelta(), 0.1);
        
        // Só processa lógica do jogo se estiver em PLAYING e todos os componentes existirem
        if (this.state === 'PLAYING' && this.player && this.dungeon) {
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
            
            // Atualiza direção do jogador para o sistema de combate
            if (this.combat && this.player) {
                this.combat.updatePlayerDirection(this.player.getDirection());
                this.combat.update(deltaTime, this.input);
            }
            
            // Atualiza inimigos
            if (this.combat) {
                this.combat.updateEnemies(deltaTime, this.player.position);
            }
            
            // Cristais
            const crystals = this.dungeon.getCrystals();
            if (crystals) {
                crystals.forEach(crystal => {
                    if (crystal.update) crystal.update(deltaTime);
                    if (!crystal.collected && this.player) {
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
            }
            // Verifica se o chefe foi derrotado para liberar os cristais/portal
if (this.combat && this.combat.getEnemyCount() === 0 && !this.bossDefeated) {
    this.bossDefeated = true;
    this.ui.showMessage("✨ BOSS DEFEATED! Collect crystals to open the portal!", 4000);
    
    // Ativa os cristais (ou mostra onde estão)
    // Se já tiver todos os cristais, ativa portal
    if (this.crystalsCollected >= this.totalCrystals) {
        const portal = this.dungeon.getPortal();
        if (portal && portal.activate) portal.activate();
    }
}
            
            // Portal
            const portal = this.dungeon.getPortal();
            if (portal) {
                if (portal.update) portal.update(deltaTime);
                
                const isActive = portal.isActive || (portal.mesh && portal.userData?.isActive);
                if (isActive && this.player) {
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
            
            // Verifica se todos os inimigos foram derrotados
            if (this.combat && this.combat.getEnemyCount() === 0 && this.combat.hasSpawnedEnemies) {
                this.ui.showMessage("✨ All enemies defeated! Find the crystals!", 2000);
                this.combat.hasSpawnedEnemies = false;
            }
            
            if (this.player.energy <= 0) {
                this.ui.showMessage(`LANTERN DIED...`, 0);
                this.state = 'GAMEOVER';
                setTimeout(() => this.resetGame(), 2000);
            }
            
            if (this.dungeon.updatePath && this.player) {
                this.dungeon.updatePath(this.player.position);
            }
            if (this.dungeon.updateMushroomPath && this.mushrooms && this.mushrooms.length > 0 && this.combat && this.combat.antidotes < 3) {
    this.dungeon.updateMushroomPath(this.player.position, this.mushrooms);
}
        }
        
        // Sempre renderiza a cena
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
        // Limpa o jogador para recriar no próximo jogo
        if (this.player) {
            this.player = null;
        }
        if (this.dungeon) {
            this.dungeon = null;
        }
        if (this.combat) {
            this.combat.clear();
            this.combat = null;
        }
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
        this.player = null;
        if (this.combat) {
            this.combat.clear();
            this.combat = null;
        }
    }
}