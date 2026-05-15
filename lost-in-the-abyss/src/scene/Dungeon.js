import * as THREE from 'three';
import { GAME_CONFIG } from '../utils/constants.js';
import { generateStoneTexture, generateNormalMap } from '../utils/helpers.js';
import { Crystal } from '../entities/Crystal.js';
import { Portal } from '../entities/Portal.js';

export class Dungeon {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.tileSize = GAME_CONFIG.TILE_SIZE;
        this.wallHeight = GAME_CONFIG.WALL_HEIGHT;
        this.playerHeight = GAME_CONFIG.PLAYER_HEIGHT;
        this.textureLoader = new THREE.TextureLoader();
        
        this.walls = [];
        this.crystals = [];
        this.portal = null;
        
        // Grupos para organização
        this.pathGroup = new THREE.Group();
        this.scene.add(this.pathGroup);
        this.greenPathGroup = new THREE.Group();
        this.scene.add(this.greenPathGroup);
        this.showGreenPath = true;
        
        this.startPosition = new THREE.Vector3(0, this.playerHeight, 0);
        
        // Elementos de horror
        this.particleSystem = null;
        this.flickeringLights = [];
        this.spiderWebs = [];
        this.skulls = [];
        this.torches = [];
        this.bloodSplatters = [];
        this.chains = [];
        this.ratSounds = [];
        this.ghostLights = [];
        this.cobwebs = [];
    }
    
    generate(levelNumber, theme) {
        this.clear();
        
        const size = theme.mapSize;
        // Gera mapa com paredes irregulares
        const map = this.generateHorrorMaze(size, theme.wallDensity);
        this.ensureConnectivity(map, size);
        
        // ===== DEBUG: IMPRIMIR A MATRIZ DO LABIRINTO =====
        if (GAME_CONFIG.DEBUG) {
            console.log(`\n💀 MAPA DO LABIRINTO HORROR (${size}x${size}) - Nível ${levelNumber}:`);
            console.log("(1 = parede | 0 = caminho)");
            for (let row = 0; row < size; row++) {
                let line = "";
                for (let col = 0; col < size; col++) {
                    line += map[row][col] + " ";
                }
                console.log(line);
            }
            console.log("");
        }
        
        const { floorMaterial, wallMaterial, bloodMaterial, torchMaterial } = this.createHorrorMaterials(theme);
        const offsetX = (size * this.tileSize) / 2;
        const offsetZ = (size * this.tileSize) / 2;
        
        let farthestPos = null;
        let farthestDist = 0;
        
        // ===== CONSTRUÇÃO COM PAREDES IRREGULARES =====
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                // Chão com textura e irregularidades
                const floorGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                const floor = new THREE.Mesh(floorGeo, floorMaterial.clone());
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x, -0.05 + Math.random() * 0.08, z);
                floor.receiveShadow = true;
                this.group.add(floor);
                
                // Adiciona manchas de sangue no chão
                this.addBloodSplat(x, z);
                
                if (map[row][col] === 1) {
                    // PAREDE IRREGULAR - espessura variável
                    this.createIrregularWall(x, z, wallMaterial, bloodMaterial, row, col);
                    this.walls.push({ x, z, type: 'wall', row, col });
                    
                    // Adiciona decorações de horror na parede
                    this.addWallHorrorDecorations(x, z, row, col);
                } else if (map[row][col] === 0) {
                    const dist = Math.sqrt(x * x + z * z);
                    if (dist > farthestDist) {
                        farthestDist = dist;
                        farthestPos = new THREE.Vector3(x, this.playerHeight, z);
                    }
                    
                    // Adiciona elementos nos corredores
                    this.addCorridorHorror(x, z);
                }
            }
        }
        
        // ===== ELEMENTOS DE HORROR =====
        // Tecto escuro com gotas
        this.createDarkCeiling(size, offsetX, offsetZ);
        
        // Iluminação dramática
        this.setupHorrorLighting(theme);
        
        // Tochas nas paredes
        this.addTorches(map, size, offsetX, offsetZ);
        
        // Teias de aranha
        this.addSpiderWebs(map, size, offsetX, offsetZ);
        
        // Caveiras e ossos
        this.addSkullsAndBones(map, size, offsetX, offsetZ);
        
        // Correntes penduradas
        this.addChains(map, size, offsetX, offsetZ);
        
        // Poças de sangue
        this.addBloodPools(map, size, offsetX, offsetZ);
        
        // Ratos (sombras animadas)
        this.addRatShadows(map, size, offsetX, offsetZ);
        
        // Lâmpadas que piscam
        this.addFlickeringLights(map, size, offsetX, offsetZ);
        
        // Almas perdidas (partículas fantasmagóricas)
        this.createGhostParticles(theme);
        
        // Poeira e partículas de horror
        this.createHorrorParticles(theme, size, offsetX, offsetZ);
        
        // ===== CRISTAIS E PORTAL =====
        this.placeHorrorCrystals(theme, size, offsetX, offsetZ, map);
        this.placeHorrorPortal(theme, farthestPos, map, size, offsetX, offsetZ);
        
        this.startPosition = new THREE.Vector3(0, this.playerHeight, 0);
        
        console.log(`💀 Masmorra de Horror: ${size}x${size}, ${this.walls.length} paredes irregulares, ${this.crystals.length} cristais, ${this.torches.length} tochas`);
    }
    
    // ===== PAREDE IRREGULAR COM ESPESSURA VARIÁVEL =====
    // No Dungeon.js, substitua o método createIrregularWall por este:

createIrregularWall(x, z, wallMaterial, bloodMaterial, row, col) {
    const wallGroup = new THREE.Group();
    
    // Varia a espessura da parede
    const thicknessVariation = 0.7 + Math.random() * 0.8;
    const widthVariation = 0.8 + Math.random() * 0.6;
    const heightVariation = 0.85 + Math.random() * 0.3;
    
    // Pilar principal
    const mainBlock = new THREE.Mesh(
        new THREE.BoxGeometry(this.tileSize * widthVariation, this.wallHeight * heightVariation, this.tileSize * thicknessVariation),
        wallMaterial.clone()
    );
    mainBlock.position.set(0, this.wallHeight * heightVariation / 2, 0);
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    wallGroup.add(mainBlock);
    
    // Adiciona blocos de pedra salientes
    const stoneCount = 4 + Math.floor(Math.random() * 6);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.85 });
    
    for (let i = 0; i < stoneCount; i++) {
        const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.2 + Math.random() * 0.4, 0.2 + Math.random() * 0.5, 0.2 + Math.random() * 0.3),
            stoneMat
        );
        stone.position.set(
            (Math.random() - 0.5) * this.tileSize * 0.8,
            Math.random() * this.wallHeight * 0.9,
            (Math.random() - 0.5) * this.tileSize * 0.6 + (Math.random() > 0.5 ? 0.5 : -0.5)
        );
        stone.castShadow = true;
        wallGroup.add(stone);
    }
    
    wallGroup.position.set(x, 0, z);
    this.group.add(wallGroup);
    
    // IMPORTANTE: Adiciona à lista de walls para colisão
    // Usamos o grupo como um todo para colisão (bounding box)
    this.walls.push(wallGroup);
}
    addWallHorrorDecorations(x, z, row, col) {
        // Caveiras nas paredes
        if (Math.random() > 0.92) {
            const skullMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.6 });
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8), skullMat);
            skull.position.set(
                x + (Math.random() - 0.5) * 1.5,
                1.2 + Math.random() * 2.5,
                z + 0.45
            );
            skull.scale.set(0.9, 1.1, 0.8);
            skull.castShadow = true;
            this.group.add(skull);
            this.skulls.push(skull);
        }
        
        // Correntes presas na parede
        if (Math.random() > 0.94) {
            this.addChainToWall(x, z);
        }
    }
    
    addChainToWall(x, z) {
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x886666, metalness: 0.7, roughness: 0.5 });
        const chainGroup = new THREE.Group();
        
        const segments = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < segments; i++) {
            const link = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.04, 6, 12), chainMat);
            link.position.set(0, -i * 0.2, 0);
            link.rotation.x = Math.PI / 2;
            link.rotation.z = Math.random() * Math.PI;
            chainGroup.add(link);
        }
        
        // Âncora/gancho na ponta
        const hook = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), chainMat);
        hook.position.set(0, -segments * 0.2, 0);
        chainGroup.add(hook);
        
        chainGroup.position.set(x + (Math.random() - 0.5) * 1.8, 2.5 + Math.random() * 1.5, z + 0.5);
        this.group.add(chainGroup);
        this.chains.push(chainGroup);
    }
    
    addBloodSplat(x, z) {
        if (Math.random() > 0.92) {
            const bloodMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.9, emissive: 0x330000 });
            const splat = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 5), bloodMat);
            splat.scale.set(1.5, 0.1, 1.2);
            splat.position.set(
                x + (Math.random() - 0.5) * 2.5,
                0.01,
                z + (Math.random() - 0.5) * 2.5
            );
            splat.receiveShadow = true;
            this.group.add(splat);
            this.bloodSplatters.push(splat);
        }
    }
    
    addCorridorHorror(x, z) {
        // Poças de sangue
        if (Math.random() > 0.96) {
            const bloodPoolMat = new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.7, emissive: 0x441111 });
            const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 0.02, 8), bloodPoolMat);
            pool.position.set(x, 0.01, z);
            pool.rotation.x = Math.PI / 2;
            pool.receiveShadow = true;
            this.group.add(pool);
        }
        
        // Ossos no chão
        if (Math.random() > 0.96) {
            const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.7 });
            const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6), boneMat);
            bone.rotation.z = Math.random() * Math.PI;
            bone.rotation.x = Math.random() * Math.PI;
            bone.position.set(x + (Math.random() - 0.5) * 1.5, 0.05, z + (Math.random() - 0.5) * 1.5);
            bone.castShadow = true;
            this.group.add(bone);
        }
    }
    
    // ===== TEIAS DE ARANHA =====
    addSpiderWebs(map, size, offsetX, offsetZ) {
        const webMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, transparent: true, opacity: 0.4, roughness: 0.9 });
        const webCount = Math.floor(size * 1.2);
        
        for (let i = 0; i < webCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.85) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const webGroup = new THREE.Group();
                
                // Teia radial
                for (let r = 0; r < 8; r++) {
                    const angle = (r / 8) * Math.PI * 2;
                    const radius = 0.6;
                    const strand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, radius), webMat);
                    strand.position.set(Math.cos(angle) * radius / 2, 1.2 + Math.random() * 1.5, Math.sin(angle) * radius / 2);
                    strand.lookAt(Math.cos(angle) * radius, 1.2, Math.sin(angle) * radius);
                    webGroup.add(strand);
                }
                
                // Teia circular
                for (let ring = 0; ring < 3; ring++) {
                    const ringRadius = 0.2 + ring * 0.15;
                    for (let seg = 0; seg < 12; seg++) {
                        const angle = (seg / 12) * Math.PI * 2;
                        const segment = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, ringRadius * 0.3), webMat);
                        segment.position.set(Math.cos(angle) * ringRadius, 1.2 + Math.random() * 1.5, Math.sin(angle) * ringRadius);
                        webGroup.add(segment);
                    }
                }
                
                webGroup.position.set(x, 0, z);
                this.group.add(webGroup);
                this.spiderWebs.push(webGroup);
            }
        }
    }
    
    // ===== CAVEIRAS E OSSOS =====
    addSkullsAndBones(map, size, offsetX, offsetZ) {
        const skullMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.5 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.6 });
        const skullCount = Math.floor(size * 0.8);
        
        for (let i = 0; i < skullCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.88) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const skullGroup = new THREE.Group();
                
                // Crânio
                const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8), skullMat);
                skull.scale.set(0.9, 1, 0.8);
                skull.castShadow = true;
                skullGroup.add(skull);
                
                // Olhos vazios
                const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
                const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6), eyeMat);
                leftEye.position.set(-0.08, 0.05, 0.18);
                skullGroup.add(leftEye);
                
                const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6), eyeMat);
                rightEye.position.set(0.08, 0.05, 0.18);
                skullGroup.add(rightEye);
                
                // Maxilar
                const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.12), skullMat);
                jaw.position.set(0, -0.08, 0.12);
                skullGroup.add(jaw);
                
                skullGroup.position.set(x, 0.12, z);
                skullGroup.rotation.y = Math.random() * Math.PI * 2;
                skullGroup.rotation.x = (Math.random() - 0.5) * 0.5;
                this.group.add(skullGroup);
                this.skulls.push(skullGroup);
                
                // Adiciona ossos ao redor
                for (let b = 0; b < 3; b++) {
                    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.25, 5), boneMat);
                    bone.position.set(
                        x + (Math.random() - 0.5) * 0.8,
                        0.05,
                        z + (Math.random() - 0.5) * 0.8
                    );
                    bone.rotation.z = Math.random() * Math.PI;
                    this.group.add(bone);
                }
            }
        }
    }
    
    // ===== CORRENTES PENDURADAS NO TECTO =====
    addChains(map, size, offsetX, offsetZ) {
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x886666, metalness: 0.6 });
        const chainCount = Math.floor(size * 0.6);
        
        for (let i = 0; i < chainCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.88) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const chainGroup = new THREE.Group();
                const segments = 8 + Math.floor(Math.random() * 8);
                
                for (let s = 0; s < segments; s++) {
                    const link = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.03, 6, 10), chainMat);
                    link.position.set(0, -s * 0.2, 0);
                    link.rotation.x = Math.PI / 2;
                    chainGroup.add(link);
                }
                
                // Gancho na ponta
                const hook = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), chainMat);
                hook.position.set(0, -segments * 0.2, 0);
                chainGroup.add(hook);
                
                chainGroup.position.set(x, this.wallHeight - 0.5, z);
                this.group.add(chainGroup);
                this.chains.push(chainGroup);
            }
        }
    }
    
    // ===== POÇAS DE SANGUE =====
    addBloodPools(map, size, offsetX, offsetZ) {
        const bloodMat = new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.7, emissive: 0x441111 });
        const poolCount = Math.floor(size * 0.8);
        
        for (let i = 0; i < poolCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.9) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.4 + Math.random() * 0.5, 0.4 + Math.random() * 0.5, 0.03, 8), bloodMat);
                pool.position.set(x, 0.01, z);
                pool.receiveShadow = true;
                this.group.add(pool);
            }
        }
    }
    
    // ===== SOMBRAS DE RATOS (animadas) =====
    addRatShadows(map, size, offsetX, offsetZ) {
        const ratCount = Math.floor(size * 0.5);
        
        for (let i = 0; i < ratCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.92) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                // Sombra de rato (círculo escuro)
                const shadowMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.4 });
                const shadow = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 6), shadowMat);
                shadow.position.set(x, 0.02, z);
                shadow.userData = {
                    speed: 0.5 + Math.random() * 1,
                    direction: (Math.random() > 0.5 ? 1 : -1),
                    originalX: x,
                    range: 1 + Math.random() * 1.5
                };
                this.group.add(shadow);
                this.ratSounds.push(shadow);
            }
        }
    }
    
    // ===== LÂMPADAS QUE PISCAM =====
    addFlickeringLights(map, size, offsetX, offsetZ) {
        const lightCount = Math.floor(size * 0.5);
        
        for (let i = 0; i < lightCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            // Luzes nas paredes
            if (map[row][col] === 0 && Math.random() > 0.85) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                // Procura parede adjacente
                let wallDir = null;
                if (map[row-1]?.[col] === 1) wallDir = 'north';
                else if (map[row+1]?.[col] === 1) wallDir = 'south';
                else if (map[row][col-1] === 1) wallDir = 'west';
                else if (map[row][col+1] === 1) wallDir = 'east';
                
                if (wallDir) {
                    const light = new THREE.PointLight(0xff6600, 0.8, 12);
                    light.position.set(x, 1.5, z);
                    light.userData = {
                        flickerSpeed: 0.05 + Math.random() * 0.1,
                        flickerPhase: Math.random() * Math.PI * 2,
                        baseIntensity: 0.5 + Math.random() * 0.5
                    };
                    this.group.add(light);
                    this.flickeringLights.push(light);
                    
                    // Luz vermelha de emergência (mais assustadora)
                    if (Math.random() > 0.7) {
                        const redLight = new THREE.PointLight(0xff3300, 0.5, 10);
                        redLight.position.set(x + (Math.random() - 0.5) * 2, 0.8, z + (Math.random() - 0.5) * 2);
                        redLight.userData = { isRed: true };
                        this.group.add(redLight);
                        this.flickeringLights.push(redLight);
                    }
                }
            }
        }
    }
    
    // ===== TOCHAS NAS PAREDES =====
    addTorches(map, size, offsetX, offsetZ) {
        const torchMat = new THREE.MeshStandardMaterial({ color: 0xaa6622, roughness: 0.4 });
        const flameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400 });
        const torchCount = Math.floor(size * 0.8);
        
        for (let i = 0; i < torchCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.82) {
                // Encontra parede adjacente
                let wallX = 0, wallZ = 0, angle = 0;
                if (map[row-1]?.[col] === 1) { wallZ = -this.tileSize/2; angle = Math.PI; }
                else if (map[row+1]?.[col] === 1) { wallZ = this.tileSize/2; angle = 0; }
                else if (map[row][col-1] === 1) { wallX = -this.tileSize/2; angle = Math.PI/2; }
                else if (map[row][col+1] === 1) { wallX = this.tileSize/2; angle = -Math.PI/2; }
                else continue;
                
                const x = col * this.tileSize - offsetX + this.tileSize/2 + wallX;
                const z = row * this.tileSize - offsetZ + this.tileSize/2 + wallZ;
                
                const torchGroup = new THREE.Group();
                
                // Haste
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 5), torchMat);
                handle.position.set(0, 0.3, 0);
                handle.castShadow = true;
                torchGroup.add(handle);
                
                // Cabeça da tocha
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5), torchMat);
                head.position.set(0, 0.65, 0);
                torchGroup.add(head);
                
                // Chama
                const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), flameMat);
                flame.position.set(0, 0.8, 0);
                flame.castShadow = true;
                torchGroup.add(flame);
                
                // Luz da tocha
                const torchLight = new THREE.PointLight(0xff8844, 0.7, 10);
                torchLight.position.set(0, 0.7, 0);
                torchGroup.add(torchLight);
                
                torchGroup.position.set(x, 0, z);
                torchGroup.rotation.y = angle;
                this.group.add(torchGroup);
                this.torches.push({ group: torchGroup, light: torchLight, flame: flame });
            }
        }
    }
    
    createDarkCeiling(size, offsetX, offsetZ) {
        // Tecto negro com gotas
        const ceilingGeo = new THREE.PlaneGeometry(size * this.tileSize, size * this.tileSize);
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0505, roughness: 0.95, emissive: 0x020000 });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, this.wallHeight, 0);
        this.group.add(ceiling);
        
        // Estalactites
        const stalMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a });
        for (let i = 0; i < 60; i++) {
            const stal = new THREE.Mesh(new THREE.ConeGeometry(0.1 + Math.random() * 0.15, 0.3 + Math.random() * 0.4, 5), stalMat);
            stal.position.set(
                (Math.random() - 0.5) * size * this.tileSize,
                this.wallHeight - 0.1,
                (Math.random() - 0.5) * size * this.tileSize
            );
            stal.castShadow = true;
            this.group.add(stal);
        }
    }
    
    setupHorrorLighting(theme) {
        // Luz ambiente muito escura
        const ambientLight = new THREE.AmbientLight(0x221111, 0.2);
        this.group.add(ambientLight);
        
        // Luz principal fraca (como se fosse lua)
        const moonLight = new THREE.DirectionalLight(0x664455, 0.25);
        moonLight.position.set(5, 15, -10);
        moonLight.castShadow = true;
        this.group.add(moonLight);
        
        // Luz de fundo avermelhada
        const backLight = new THREE.PointLight(0x882222, 0.15, 30);
        backLight.position.set(0, 5, -15);
        this.group.add(backLight);
        
        // Luz verde fantasmagórica aleatória
        for (let i = 0; i < 8; i++) {
            const ghostLight = new THREE.PointLight(0x44aa88, 0.2, 12);
            ghostLight.position.set(
                (Math.random() - 0.5) * 40,
                1 + Math.random() * 5,
                (Math.random() - 0.5) * 40
            );
            this.group.add(ghostLight);
            this.ghostLights.push(ghostLight);
        }
    }
    
    createGhostParticles(theme) {
        const ghostCount = 150;
        const ghostGeometry = new THREE.BufferGeometry();
        const ghostPositions = new Float32Array(ghostCount * 3);
        const ghostColors = new Float32Array(ghostCount * 3);
        
        for (let i = 0; i < ghostCount; i++) {
            ghostPositions[i*3] = (Math.random() - 0.5) * 60;
            ghostPositions[i*3+1] = Math.random() * this.wallHeight;
            ghostPositions[i*3+2] = (Math.random() - 0.5) * 60;
            
            const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, 0.5);
            ghostColors[i*3] = color.r * 0.5;
            ghostColors[i*3+1] = color.g;
            ghostColors[i*3+2] = color.b;
        }
        
        ghostGeometry.setAttribute('position', new THREE.BufferAttribute(ghostPositions, 3));
        ghostGeometry.setAttribute('color', new THREE.BufferAttribute(ghostColors, 3));
        
        const ghostMat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
        this.particleSystem = new THREE.Points(ghostGeometry, ghostMat);
        this.group.add(this.particleSystem);
    }
    
    createHorrorParticles(theme, size, offsetX, offsetZ) {
        const particleCount = 800;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i*3] = (Math.random() - 0.5) * size * this.tileSize;
            positions[i*3+1] = Math.random() * this.wallHeight;
            positions[i*3+2] = (Math.random() - 0.5) * size * this.tileSize;
            
            // Cores entre vermelho e laranja (poeira de sangue)
            const color = new THREE.Color().setHSL(0.05 + Math.random() * 0.1, 0.9, 0.3 + Math.random() * 0.2);
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.group.add(particles);
    }
    
    createHorrorMaterials(theme) {
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a2a2a, 
            roughness: 0.9,
            metalness: 0.05
        });
        
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a3a3a, 
            roughness: 0.85,
            metalness: 0.08
        });
        
        const bloodMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x882222, 
            roughness: 0.6,
            emissive: 0x220000,
            metalness: 0.02
        });
        
        const torchMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xaa6622, 
            roughness: 0.5,
            metalness: 0.1
        });
        
        return { floorMaterial, wallMaterial, bloodMaterial, torchMaterial };
    }
    
    generateHorrorMaze(size, wallDensity) {
        // Mapa base (labirinto padrão)
        const map = Array(size).fill().map(() => Array(size).fill(1));
        const startX = Math.floor(size/2);
        const startY = Math.floor(size/2);
        map[startY][startX] = 0;
        
        let frontier = [];
        const dirs = [[0,2],[0,-2],[2,0],[-2,0]];
        
        for (let [dy,dx] of dirs) {
            const ny = startY+dy, nx = startX+dx;
            if (ny>0 && ny<size-1 && nx>0 && nx<size-1) {
                frontier.push([ny,nx,startY,startX]);
            }
        }
        
        while (frontier.length) {
            const idx = Math.floor(Math.random() * frontier.length);
            const [ny,nx,fromY,fromX] = frontier[idx];
            frontier.splice(idx,1);
            
            if (map[ny][nx] === 1) {
                map[ny][nx] = 0;
                map[fromY+(ny-fromY)/2][fromX+(nx-fromX)/2] = 0;
                
                for (let [dy,dx] of dirs) {
                    const nny = ny+dy, nnx = nx+dx;
                    if (nny>0 && nny<size-1 && nnx>0 && nnx<size-1 && map[nny][nnx]===1) {
                        frontier.push([nny,nnx,ny,nx]);
                    }
                }
            }
        }
        
        // Adiciona mais paredes (mais denso e claustrofóbico)
        const targetWalls = Math.floor(size*size * (wallDensity + 0.1));
        let currentWalls = 0;
        for (let row=0; row<size; row++) for (let col=0; col<size; col++) if (map[row][col]===1) currentWalls++;
        
        if (currentWalls < targetWalls) {
            const cells = [];
            for (let row=1; row<size-1; row++) for (let col=1; col<size-1; col++) if (map[row][col]===0) cells.push([row,col]);
            cells.sort(()=>Math.random()-0.5);
            const toAdd = Math.min(targetWalls-currentWalls, cells.length);
            for (let i=0; i<toAdd; i++) { const [r,c]=cells[i]; map[r][c]=1; }
        }
        
        // Bordas
        for (let i=0; i<size; i++) { map[0][i]=1; map[size-1][i]=1; map[i][0]=1; map[i][size-1]=1; }
        map[startY][startX]=0;
        
        return map;
    }
    
    ensureConnectivity(map, size) {
        const visited = Array(size).fill().map(()=>Array(size).fill(false));
        const queue = [[Math.floor(size/2), Math.floor(size/2)]];
        visited[Math.floor(size/2)][Math.floor(size/2)] = true;
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        
        while (queue.length) {
            const [row,col] = queue.shift();
            for (let [dy,dx] of dirs) {
                const nr = row+dy, nc = col+dx;
                if (nr>0 && nr<size-1 && nc>0 && nc<size-1 && !visited[nr][nc] && map[nr][nc]===0) {
                    visited[nr][nc]=true;
                    queue.push([nr,nc]);
                }
            }
        }
        
        for (let row=1; row<size-1; row++) {
            for (let col=1; col<size-1; col++) {
                if (map[row][col]===0 && !visited[row][col]) {
                    for (let [dy,dx] of dirs) {
                        const nr = row+dy, nc = col+dx;
                        if (nr>0 && nr<size-1 && nc>0 && nc<size-1 && visited[nr][nc]) {
                            map[row][col]=0;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    placeHorrorCrystals(theme, size, offsetX, offsetZ, map) {
        const floorCells = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (map[row][col] === 0) {
                    const x = col * this.tileSize - offsetX + this.tileSize/2;
                    const z = row * this.tileSize - offsetZ + this.tileSize/2;
                    const distFromCenter = Math.sqrt(x*x + z*z);
                    if (distFromCenter > 4) {
                        floorCells.push(new THREE.Vector3(x, this.playerHeight * 0.5, z));
                    }
                }
            }
        }
        
        for (let i = floorCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [floorCells[i], floorCells[j]] = [floorCells[j], floorCells[i]];
        }
        
        const crystalCount = Math.min(theme.totalCrystals, floorCells.length);
        const HORROR_COLORS = [0xff4444, 0xaa44ff, 0xff6644, 0xcc44aa, 0xff3366];
        
        for (let i = 0; i < crystalCount; i++) {
            const pos = floorCells[i];
            const color = HORROR_COLORS[i % HORROR_COLORS.length];
            const crystal = new Crystal(color, 0.55);
            crystal.mesh.position.copy(pos);
            this.group.add(crystal.mesh);
            this.crystals.push(crystal);
        }
    }
    
    placeHorrorPortal(theme, farthestPos, map, size, offsetX, offsetZ) {
        if (farthestPos) {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(farthestPos);
            this.portal.mesh.position.y = this.playerHeight * 0.6;
            this.group.add(this.portal.mesh);
            
            // Adiciona aura vermelha ao portal
            const portalGlow = new THREE.PointLight(0xff3366, 0.8, 8);
            portalGlow.position.copy(farthestPos);
            portalGlow.position.y = 1.2;
            this.group.add(portalGlow);
            this.flickeringLights.push(portalGlow);
        } else {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.set(0, this.playerHeight * 0.6, 0);
            this.group.add(this.portal.mesh);
        }
    }
    
    getStartPosition() { return this.startPosition; }
    getWalls() { return this.walls; }
    getCrystals() { return this.crystals; }
    getPortal() { return this.portal; }
    
    updatePath(playerPosition) {
        // Limpa caminhos
        while(this.pathGroup.children.length) this.pathGroup.remove(this.pathGroup.children[0]);
        
        const available = this.crystals.filter(c => !c.collected);
        if (available.length === 0) return;
        
        let nearest = null, minDist = Infinity;
        for (const crystal of available) {
            const dist = playerPosition.distanceTo(crystal.mesh.position);
            if (dist < minDist) { minDist = dist; nearest = crystal; }
        }
        
        if (nearest && minDist > 2) {
            const start = playerPosition.clone();
            const end = nearest.mesh.position.clone();
            const material = new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0x441122 });
            
            const steps = Math.floor(minDist / 0.4);
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const point = start.clone().lerp(end, t);
                point.y = 0.1;
                
                if (i > 0) {
                    const prev = start.clone().lerp(end, (i-1)/steps);
                    prev.y = 0.1;
                    const dir = new THREE.Vector3().subVectors(point, prev);
                    const length = dir.length();
                    if (length > 0.01) {
                        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, length, 4), material);
                        cylinder.position.copy(prev.clone().add(point).multiplyScalar(0.5));
                        cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
                        this.pathGroup.add(cylinder);
                    }
                }
            }
        }
        
        // ===== ANIMAÇÕES DE HORROR =====
        const time = Date.now() * 0.003;
        
        // Anima tochas (chamas tremulam)
        this.torches.forEach(torch => {
            if (torch.light) {
                torch.light.intensity = 0.5 + Math.sin(time * 12) * 0.3;
            }
            if (torch.flame) {
                const scale = 0.8 + Math.sin(time * 15) * 0.3;
                torch.flame.scale.set(scale, scale + 0.2, scale);
            }
        });
        
        // Anima luzes que piscam
        this.flickeringLights.forEach((light, idx) => {
            if (light.userData) {
                const intensity = light.userData.baseIntensity || 0.5;
                light.intensity = intensity + Math.sin(time * (light.userData.flickerSpeed || 0.08) * 10 + idx) * 0.3;
            }
        });
        
        // Anima almas (partículas)
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.002;
            const positions = this.particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i*3+1] += 0.003;
                if (positions[i*3+1] > this.wallHeight) {
                    positions[i*3+1] = 0;
                }
            }
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }
        
        // Anima sombras de ratos
        this.ratSounds.forEach(rat => {
            const data = rat.userData;
            if (data) {
                rat.position.x = data.originalX + Math.sin(time * data.speed) * data.range;
            }
        });
        
        // Anima luzes fantasmas
        this.ghostLights.forEach((light, idx) => {
            light.intensity = 0.15 + Math.sin(time * 1.5 + idx) * 0.1;
        });
    }
    
    clear() {
        // Limpa todos os grupos e elementos
        const disposeGroup = (group) => {
            while (group.children.length > 0) {
                const child = group.children[0];
                group.remove(child);
                if (child.isMesh) {
                    if (child.material) child.material.dispose();
                    if (child.geometry) child.geometry.dispose();
                } else if (child.isGroup) {
                    disposeGroup(child);
                }
            }
        };
        
        disposeGroup(this.group);
        disposeGroup(this.pathGroup);
        disposeGroup(this.greenPathGroup);
        
        this.walls = [];
        this.crystals = [];
        this.torches = [];
        this.flickeringLights = [];
        this.ghostLights = [];
        this.spiderWebs = [];
        this.skulls = [];
        this.chains = [];
        this.ratSounds = [];
        this.portal = null;
    }
}