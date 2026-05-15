import * as THREE from 'three';
import { Crystal } from '../entities/Crystal.js';
import { Portal } from '../entities/Portal.js';
import { GAME_CONFIG } from '../utils/constants.js';

export class DungeonForest {
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
        
        // Sistemas de partículas e detalhes
        this.pathGroup = new THREE.Group();
        this.scene.add(this.pathGroup);
        this.greenPathGroup = new THREE.Group();
        this.scene.add(this.greenPathGroup);
        
        this.startPosition = new THREE.Vector3(0, this.playerHeight, 0);
        
        this.leafParticles = null;
        this.fireflies = [];
        this.groundDetails = [];
        this.trees = [];
    }
    
    generate(levelNumber, theme) {
        this.clear();
        
        const size = theme.mapSize;
        
        // Gera labirinto orgânico
const { map, passages } = this.createOrganicMaze(size, theme.wallDensity);
        
        // Cria materiais da floresta
        const { floorMaterial, wallMaterial, mossMaterial, dirtMaterial } = this.createForestMaterials(theme);
        
        const offsetX = (size * this.tileSize) / 2;
        const offsetZ = (size * this.tileSize) / 2;
        
        let farthestPos = null;
        let farthestDist = -1;
        
        // ===== CONSTRUÇÃO DO TERRENO COM DETALHES =====
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                // Determina tipo de terreno (altura variável)
                let groundType = 'grass';
                let heightOffset = 0;
                
                if (map[row][col] === 1) {
                    // Área de parede - terreno mais irregular
                    heightOffset = Math.random() * 0.15;
                    groundType = 'dirt';
                } else {
                    // Área de caminho - terreno com pequenas variações
                    heightOffset = Math.random() * 0.1;
                    if (Math.random() > 0.7) groundType = 'dirt';
                    else if (Math.random() > 0.8) groundType = 'moss';
                }
                
                // CHÃO PRINCIPAL com altura variável
                const floorMat = groundType === 'grass' ? floorMaterial : 
                                groundType === 'dirt' ? dirtMaterial : mossMaterial;
                const floorGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                const floor = new THREE.Mesh(floorGeo, floorMat.clone());
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x, heightOffset, z);
                floor.receiveShadow = true;
                this.group.add(floor);
                
                // ADICIONA DETALHES DO CHÃO (folhas, pedras, musgo)
                this.addGroundDetail(x, z, heightOffset, groundType, map[row][col]);
                
                // CRIA PAREDES COM FISSURAS (larguras variáveis)
                if (map[row][col] === 1) {
                    this.createOrganicWall(x, z, wallMaterial, mossMaterial);
                } 
                // CAMINHOS - adiciona textura de trilha
                else if (map[row][col] === 0) {
                    this.addTrailDetail(x, z, heightOffset);
                    
                    const dist = Math.sqrt(x * x + z * z);
                    if (dist > farthestDist) {
                        farthestDist = dist;
                        farthestPos = new THREE.Vector3(x, this.playerHeight, z);
                    }
                }
            }
        }
        
        // Adiciona elementos visuais da floresta
        this.createSky(theme);
        this.setupOutdoorLighting(theme);
        
        // Árvores (altura correta)
        this.addDetailedTrees(theme, map, size, offsetX, offsetZ);
        
        // Arbustos e vegetação rasteira
        this.addUnderbrush(theme, map, size, offsetX, offsetZ);
        
        // Pedras e troncos caídos
        this.addRocksAndLogs(theme, map, size, offsetX, offsetZ);
        
        // Cogumelos bioluminescentes
        this.addMushrooms(theme, map, size, offsetX, offsetZ);
        
        this.createLeafParticles(theme);
        
        // Posiciona cristais
        this.placeCrystals(theme, size, offsetX, offsetZ, map);
        
        // Posiciona portal
        this.placePortal(theme, farthestPos);
        
        this.startPosition = new THREE.Vector3(0, this.playerHeight, 0);
        
        console.log(`🌲 Floresta orgânica: ${size}x${size}, ${this.walls.length} paredes, ${this.crystals.length} cristais`);
    }
    
    // ===== PAREDES COM FISSURAS E LARGURAS VARIÁVEIS =====
    createOrganicWall(x, z, wallMaterial, mossMaterial) {
        const wallGroup = new THREE.Group();
        
        // Pilar central principal
        const mainWall = new THREE.Mesh(
            new THREE.BoxGeometry(this.tileSize * 0.7, this.wallHeight, this.tileSize * 0.7),
            wallMaterial.clone()
        );
        mainWall.position.set(0, this.wallHeight / 2, 0);
        mainWall.castShadow = true;
        mainWall.receiveShadow = true;
        wallGroup.add(mainWall);
        
        // Adiciona "fissuras" - rochas salientes em diferentes alturas e larguras
        const crackCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < crackCount; i++) {
            const crackWidth = 0.2 + Math.random() * 0.5;
            const crackHeight = 0.3 + Math.random() * 0.8;
            const crackDepth = 0.1 + Math.random() * 0.3;
            const crackY = Math.random() * this.wallHeight;
            
            const crack = new THREE.Mesh(
                new THREE.BoxGeometry(crackWidth, crackHeight, crackDepth),
                wallMaterial
            );
            crack.position.set(
                (Math.random() - 0.5) * this.tileSize * 0.6,
                crackY,
                this.tileSize * 0.35 * (Math.random() > 0.5 ? 1 : -1)
            );
            crack.castShadow = true;
            wallGroup.add(crack);
        }
        
        // Musgo nas paredes (manchas verdes)
        const mossCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < mossCount; i++) {
            const mossPatch = new THREE.Mesh(
                new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 4),
                mossMaterial
            );
            mossPatch.position.set(
                (Math.random() - 0.5) * this.tileSize * 0.8,
                Math.random() * this.wallHeight * 0.7,
                this.tileSize * 0.4 * (Math.random() > 0.5 ? 1 : -1)
            );
            mossPatch.castShadow = true;
            wallGroup.add(mossPatch);
        }
        
        // Pequenas plantas/ervas na base da parede
        if (Math.random() > 0.6) {
            const plantMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a });
            for (let i = 0; i < 3; i++) {
                const plant = new THREE.Mesh(
                    new THREE.ConeGeometry(0.1, 0.3, 4),
                    plantMat
                );
                plant.position.set(
                    (Math.random() - 0.5) * this.tileSize * 0.6,
                    0.15,
                    this.tileSize * 0.45 * (Math.random() > 0.5 ? 1 : -1)
                );
                plant.castShadow = true;
                wallGroup.add(plant);
            }
        }
        
        wallGroup.position.set(x, 0, z);
        this.group.add(wallGroup);
        this.walls.push(wallGroup);
    }
    
    // ===== DETALHES DO CHÃO =====
    addGroundDetail(x, z, yOffset, groundType, isWall) {
        const detailGroup = new THREE.Group();
        
        if (isWall === 1) {
            // Terreno ao redor das paredes - mais irregular
            const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.9 });
            const detailCount = 4 + Math.floor(Math.random() * 5);
            
            for (let i = 0; i < detailCount; i++) {
                const type = Math.random();
                if (type < 0.6) {
                    // Pequenas pedras
                    const rock = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.1),
                        rockMat
                    );
                    rock.position.set(
                        (Math.random() - 0.5) * this.tileSize * 0.7,
                        yOffset + Math.random() * 0.1,
                        (Math.random() - 0.5) * this.tileSize * 0.7
                    );
                    rock.scale.set(1, Math.random() * 0.5 + 0.5, 1);
                    rock.castShadow = true;
                    detailGroup.add(rock);
                } else {
                    // Folhas secas
                    const leafMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a });
                    const leaf = new THREE.Mesh(
                        new THREE.PlaneGeometry(0.1, 0.15),
                        leafMat
                    );
                    leaf.rotation.x = -Math.PI / 2;
                    leaf.rotation.z = Math.random() * Math.PI;
                    leaf.position.set(
                        (Math.random() - 0.5) * this.tileSize * 0.8,
                        yOffset + 0.02,
                        (Math.random() - 0.5) * this.tileSize * 0.8
                    );
                    leaf.receiveShadow = true;
                    detailGroup.add(leaf);
                }
            }
        } else {
            // Caminhos - grama e flores
            if (groundType === 'grass' && Math.random() > 0.7) {
                const grassMat = new THREE.MeshStandardMaterial({ color: 0x5a9a4a });
                const grassBlades = 3 + Math.floor(Math.random() * 5);
                for (let i = 0; i < grassBlades; i++) {
                    const blade = new THREE.Mesh(
                        new THREE.ConeGeometry(0.05, 0.15 + Math.random() * 0.1, 3),
                        grassMat
                    );
                    blade.position.set(
                        (Math.random() - 0.5) * this.tileSize * 0.8,
                        yOffset + 0.05,
                        (Math.random() - 0.5) * this.tileSize * 0.8
                    );
                    blade.castShadow = false;
                    detailGroup.add(blade);
                }
            } else if (groundType === 'moss' && Math.random() > 0.8) {
                const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffaa88 });
                const flower = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.1, 0.12, 6),
                    flowerMat
                );
                flower.position.set(
                    (Math.random() - 0.5) * this.tileSize * 0.9,
                    yOffset + 0.06,
                    (Math.random() - 0.5) * this.tileSize * 0.9
                );
                detailGroup.add(flower);
            }
        }
        
        if (detailGroup.children.length > 0) {
            detailGroup.position.set(x, 0, z);
            this.group.add(detailGroup);
            this.groundDetails.push(detailGroup);
        }
    }
    
    addTrailDetail(x, z, yOffset) {
        // Adiciona detalhes de trilha (pegadas, terra batida)
        if (Math.random() > 0.9) {
            const footprintMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a });
            const footprint = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.02, 0.25),
                footprintMat
            );
            footprint.position.set(
                (Math.random() - 0.5) * 1.5,
                yOffset + 0.01,
                (Math.random() - 0.5) * 1.5
            );
            footprint.rotation.y = Math.random() * Math.PI;
            footprint.receiveShadow = true;
            this.group.add(footprint);
        }
    }
    
    // ===== VEGETAÇÃO DETALHADA =====
    addDetailedTrees(theme, map, size, offsetX, offsetZ) {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
        const darkTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2a0a, roughness: 0.95 });
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.5 });
        const lightFoliageMat = new THREE.MeshStandardMaterial({ color: 0x5a9a3a, roughness: 0.4 });
        
        // Árvores na borda
        const borderTreeCount = 40;
        const margin = (size / 2) * this.tileSize;
        
        for (let i = 0; i < borderTreeCount; i++) {
            const side = Math.floor(Math.random() * 4);
            let x, z;
            switch(side) {
                case 0: x = -margin - 3; z = (Math.random() - 0.5) * size * this.tileSize; break;
                case 1: x = margin + 3; z = (Math.random() - 0.5) * size * this.tileSize; break;
                case 2: z = -margin - 3; x = (Math.random() - 0.5) * size * this.tileSize; break;
                default: z = margin + 3; x = (Math.random() - 0.5) * size * this.tileSize; break;
            }
            this.addDetailedTree(trunkMat, darkTrunkMat, foliageMat, lightFoliageMat, x, z, true);
        }
        
        // Árvores internas (apenas em áreas abertas)
        for (let row = 2; row < size - 2; row++) {
            for (let col = 2; col < size - 2; col++) {
                if (map[row][col] === 0) {
                    // Verifica espaço aberto
                    let openSpace = true;
                    let openCount = 0;
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            if (map[row + dy]?.[col + dx] === 1) openCount++;
                        }
                    }
                    
                    // Espaço aberto com poucas paredes ao redor
                    if (openCount < 8 && Math.random() > 0.92) {
                        const x = col * this.tileSize - offsetX + this.tileSize / 2;
                        const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                        this.addDetailedTree(trunkMat, darkTrunkMat, foliageMat, lightFoliageMat, x, z, false);
                    }
                }
            }
        }
    }
    
    addDetailedTree(trunkMat, darkTrunkMat, foliageMat, lightFoliageMat, x, z, isBorder) {
        const treeGroup = new THREE.Group();
        const treeHeight = isBorder ? 3.5 + Math.random() * 1.5 : 2.5 + Math.random() * 1.2;
        const trunkRadius = isBorder ? 0.5 : 0.4;
        
        // Tronco com irregularidades
        const trunkSegments = 5;
        let currentY = 0;
        const segmentHeight = treeHeight / trunkSegments;
        
        for (let i = 0; i < trunkSegments; i++) {
            const segmentRadius = trunkRadius * (1 - (i / trunkSegments) * 0.3);
            const segment = new THREE.Mesh(
                new THREE.CylinderGeometry(segmentRadius, segmentRadius * 1.1, segmentHeight, 6),
                i % 2 === 0 ? trunkMat : darkTrunkMat
            );
            segment.position.y = currentY + segmentHeight / 2;
            segment.castShadow = true;
            treeGroup.add(segment);
            currentY += segmentHeight;
        }
        
        // Raízes na base
        const rootCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < rootCount; i++) {
            const root = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.15, 0.4, 4),
                trunkMat
            );
            const angle = (i / rootCount) * Math.PI * 2;
            root.position.set(Math.cos(angle) * 0.5, 0.2, Math.sin(angle) * 0.5);
            root.rotation.z = angle;
            root.castShadow = true;
            treeGroup.add(root);
        }
        
        // Copa da árvore (várias camadas)
        const foliageLayers = isBorder ? 4 : 3;
        const startFoliage = treeHeight * 0.6;
        
        for (let i = 0; i < foliageLayers; i++) {
            const layerMat = i % 2 === 0 ? foliageMat : lightFoliageMat;
            const layerSize = 0.8 - (i * 0.15);
            const layerHeight = 0.7 - (i * 0.1);
            
            const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(layerSize, layerHeight, 8),
                layerMat
            );
            foliage.position.y = startFoliage + (i * (layerHeight * 0.7));
            foliage.castShadow = true;
            treeGroup.add(foliage);
        }
        
        treeGroup.position.set(x, 0, z);
        this.group.add(treeGroup);
        this.trees.push(treeGroup);
    }
    
    addUnderbrush(theme, map, size, offsetX, offsetZ) {
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8 });
        const fernMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a });
        
        for (let row = 1; row < size - 1; row++) {
            for (let col = 1; col < size - 1; col++) {
                if (map[row][col] === 0 && Math.random() > 0.75) {
                    const x = col * this.tileSize - offsetX + this.tileSize / 2;
                    const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                    
                    if (Math.random() > 0.6) {
                        // Arbusto redondo
                        const bush = new THREE.Mesh(
                            new THREE.SphereGeometry(0.25 + Math.random() * 0.15, 5),
                            bushMat
                        );
                        bush.position.set(x, 0.2, z);
                        bush.castShadow = true;
                        this.group.add(bush);
                    } else {
                        // Grupo de samambaias
                        const fernGroup = new THREE.Group();
                        const fronds = 3 + Math.floor(Math.random() * 4);
                        for (let f = 0; f < fronds; f++) {
                            const frond = new THREE.Mesh(
                                new THREE.ConeGeometry(0.08, 0.3, 4),
                                fernMat
                            );
                            frond.position.set(
                                (Math.random() - 0.5) * 0.4,
                                0.15,
                                (Math.random() - 0.5) * 0.4
                            );
                            frond.rotation.x = Math.random() * 0.5;
                            frond.rotation.z = Math.random() * Math.PI;
                            frond.castShadow = true;
                            fernGroup.add(frond);
                        }
                        fernGroup.position.set(x, 0, z);
                        this.group.add(fernGroup);
                    }
                }
            }
        }
    }
    
    addRocksAndLogs(theme, map, size, offsetX, offsetZ) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.95 });
        const logMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
        
        for (let row = 1; row < size - 1; row++) {
            for (let col = 1; col < size - 1; col++) {
                if (map[row][col] === 0 && Math.random() > 0.85) {
                    const x = col * this.tileSize - offsetX + this.tileSize / 2;
                    const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                    
                    if (Math.random() > 0.7) {
                        // Pedra
                        const rock = new THREE.Mesh(
                            new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.15),
                            rockMat
                        );
                        rock.scale.set(1, Math.random() * 0.6 + 0.4, 1);
                        rock.position.set(x, 0.1, z);
                        rock.castShadow = true;
                        this.group.add(rock);
                    } else {
                        // Tronco caído
                        const log = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.15, 0.18, 0.8 + Math.random() * 0.5, 6),
                            logMat
                        );
                        log.rotation.x = Math.PI / 2;
                        log.rotation.z = Math.random() * Math.PI;
                        log.position.set(x, 0.1, z);
                        log.castShadow = true;
                        this.group.add(log);
                        
                        // Cogumelos no tronco
                        if (Math.random() > 0.5) {
                            const mushroomMat = new THREE.MeshStandardMaterial({ color: 0xcc8844 });
                            for (let m = 0; m < 2; m++) {
                                const mushroom = new THREE.Mesh(
                                    new THREE.CylinderGeometry(0.08, 0.1, 0.1, 5),
                                    mushroomMat
                                );
                                mushroom.position.set(
                                    (Math.random() - 0.5) * 0.5,
                                    0.2,
                                    (Math.random() - 0.5) * 0.5
                                );
                                log.add(mushroom);
                            }
                        }
                    }
                }
            }
        }
    }
    
    addMushrooms(theme, map, size, offsetX, offsetZ) {
        const mushroomCapMat = new THREE.MeshStandardMaterial({ color: 0xdd8844, emissive: 0x442200 });
        const mushroomStemMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb });
        
        for (let row = 1; row < size - 1; row++) {
            for (let col = 1; col < size - 1; col++) {
                if (map[row][col] === 0 && Math.random() > 0.92) {
                    const x = col * this.tileSize - offsetX + this.tileSize / 2;
                    const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                    
                    const mushroomGroup = new THREE.Group();
                    const stem = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.08, 0.1, 0.15, 5),
                        mushroomStemMat
                    );
                    stem.position.y = 0.075;
                    stem.castShadow = true;
                    mushroomGroup.add(stem);
                    
                    const cap = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.18, 0.2, 0.08, 8),
                        mushroomCapMat
                    );
                    cap.position.y = 0.15;
                    cap.castShadow = true;
                    mushroomGroup.add(cap);
                    
                    mushroomGroup.position.set(x, 0, z);
                    this.group.add(mushroomGroup);
                }
            }
        }
    }
    
    createOrganicMaze(size, wallDensity) {
        // Inicializa mapa
        const map = Array(size).fill().map(() => Array(size).fill(1));
        
        // Algoritmo DFS para labirinto (células ímpares)
        const startX = Math.floor(size / 2);
        const startZ = Math.floor(size / 2);
        const mazeStartX = startX % 2 === 0 ? startX + 1 : startX;
        const mazeStartZ = startZ % 2 === 0 ? startZ + 1 : startZ;
        
        if (mazeStartX < size && mazeStartZ < size) {
            map[mazeStartZ][mazeStartX] = 0;
        }
        
        const stack = [{ x: mazeStartX, z: mazeStartZ }];
        const dirs = [
            { dx: 0, dz: -2, wallX: 0, wallZ: -1 },
            { dx: 0, dz: 2, wallX: 0, wallZ: 1 },
            { dx: -2, dz: 0, wallX: -1, wallZ: 0 },
            { dx: 2, dz: 0, wallX: 1, wallZ: 0 }
        ];
        
        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const { x, z } = current;
            
            const neighbors = [];
            for (const dir of dirs) {
                const nx = x + dir.dx;
                const nz = z + dir.dz;
                
                if (nx > 0 && nx < size - 1 && nz > 0 && nz < size - 1 && map[nz][nx] === 1) {
                    neighbors.push({ nx, nz, dir });
                }
            }
            
            if (neighbors.length > 0) {
                const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                const { nx, nz, dir } = randomNeighbor;
                
                const wallX = x + dir.wallX;
                const wallZ = z + dir.wallZ;
                map[wallZ][wallX] = 0;
                map[nz][nx] = 0;
                
                stack.push({ x: nx, z: nz });
            } else {
                stack.pop();
            }
        }
        
        // Adiciona variedade - remove algumas paredes para criar áreas mais abertas
        const openAreas = Math.floor(size * size * 0.05);
        for (let i = 0; i < openAreas; i++) {
            const x = 2 + Math.floor(Math.random() * (size - 4));
            const z = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[z][x] === 1) {
                let openNeighbors = 0;
                const neighbors = [[z-1,x], [z+1,x], [z,x-1], [z,x+1]];
                for (const [nz, nx] of neighbors) {
                    if (map[nz]?.[nx] === 0) openNeighbors++;
                }
                if (openNeighbors >= 2) {
                    map[z][x] = 0;
                }
            }
        }
        
        // Bordas
        for (let i = 0; i < size; i++) {
            map[0][i] = 1;
            map[size-1][i] = 1;
            map[i][0] = 1;
            map[i][size-1] = 1;
        }
        
        map[mazeStartZ][mazeStartX] = 0;
        
        return { map, passages: [] };
    }
    
    createForestMaterials(theme) {
        // Textura de grama
        const grassMat = new THREE.MeshStandardMaterial({ 
            color: 0x5a8a4a, 
            roughness: 0.85,
            metalness: 0.05
        });
        
        // Textura de terra
        const dirtMat = new THREE.MeshStandardMaterial({ 
            color: 0x7a5a3a, 
            roughness: 0.95,
            metalness: 0.02
        });
        
        // Textura de musgo
        const mossMat = new THREE.MeshStandardMaterial({ 
            color: 0x4a7a3a, 
            roughness: 0.8,
            metalness: 0.03
        });
        
        // Textura de parede (casca)
        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0x6a4a2a, 
            roughness: 0.85,
            metalness: 0.05
        });
        
        return {
            floorMaterial: grassMat,
            wallMaterial: wallMat,
            mossMaterial: mossMat,
            dirtMaterial: dirtMat
        };
    }
    
    createSky(theme) {
        this.scene.background = new THREE.Color(0x1a2a3a);
        this.scene.fog = new THREE.FogExp2(0x3a5a4a, theme.fogDensity * 0.6);
    }
    
    setupOutdoorLighting(theme) {
        const ambientLight = new THREE.AmbientLight(0x4a6a4a, 0.55);
        this.group.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffdd99, 1.0);
        sunLight.position.set(15, 20, 5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        this.group.add(sunLight);
        
        // Luz de preenchimento
        const fillLight = new THREE.PointLight(0x88aaff, 0.25);
        fillLight.position.set(-5, 8, -10);
        this.group.add(fillLight);
        
        // Vaga-lumes
        for (let i = 0; i < 50; i++) {
            const firefly = new THREE.PointLight(0xaaff66, 0.25, 12);
            firefly.position.set(
                (Math.random() - 0.5) * 70,
                1 + Math.random() * 4,
                (Math.random() - 0.5) * 70
            );
            this.group.add(firefly);
            this.fireflies.push(firefly);
        }
    }
    
    createLeafParticles(theme) {
        const leafCount = 400;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(leafCount * 3);
        
        for (let i = 0; i < leafCount; i++) {
            positions[i*3] = (Math.random() - 0.5) * 80;
            positions[i*3+1] = Math.random() * 18;
            positions[i*3+2] = (Math.random() - 0.5) * 80;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const leafMat = new THREE.PointsMaterial({
            color: 0x8aba6a,
            size: 0.08,
            transparent: true,
            opacity: 0.55
        });
        
        this.leafParticles = new THREE.Points(geometry, leafMat);
        this.group.add(this.leafParticles);
    }
    
    placeCrystals(theme, size, offsetX, offsetZ, map) {
        const positions = [];
        
        for (let row = 1; row < size - 1; row++) {
            for (let col = 1; col < size - 1; col++) {
                if (map[row][col] === 0) {
                    const x = col * this.tileSize - offsetX + this.tileSize/2;
                    const z = row * this.tileSize - offsetZ + this.tileSize/2;
                    const distFromCenter = Math.sqrt(x*x + z*z);
                    if (distFromCenter > 4) {
                        positions.push(new THREE.Vector3(x, this.playerHeight * 0.5, z));
                    }
                }
            }
        }
        
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        
        const crystalCount = Math.min(theme.totalCrystals, positions.length);
        const colors = [0x88ff88, 0xaaff66, 0x66ffaa, 0xffaa66, 0x88ffaa];
        
        for (let i = 0; i < crystalCount; i++) {
            const color = colors[i % colors.length];
            const crystal = new Crystal(color, 0.55);
            crystal.mesh.position.copy(positions[i]);
            this.group.add(crystal.mesh);
            this.crystals.push(crystal);
        }
    }
    
    placePortal(theme, farthestPos) {
        if (farthestPos) {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(farthestPos);
            this.portal.mesh.position.y = this.playerHeight * 0.7;
            this.group.add(this.portal.mesh);
        } else {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.set(4, this.playerHeight * 0.7, 4);
            this.group.add(this.portal.mesh);
        }
    }
    
    getStartPosition() { return this.startPosition; }
    getWalls() { return this.walls; }
    getCrystals() { return this.crystals; }
    getPortal() { return this.portal; }
    
    updatePath(playerPosition) {
        // Limpa caminho
        while(this.pathGroup.children.length > 0) {
            const child = this.pathGroup.children[0];
            if (child.material) child.material.dispose();
            if (child.geometry) child.geometry.dispose();
            this.pathGroup.remove(child);
        }
        
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
            const material = new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0x442200 });
            
            const steps = Math.floor(minDist / 0.5);
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
                        const cylinder = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.08, 0.08, length, 4),
                            material
                        );
                        cylinder.position.copy(prev.clone().add(point).multiplyScalar(0.5));
                        cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
                        this.pathGroup.add(cylinder);
                    }
                }
            }
        }
        
        // Anima folhas
        if (this.leafParticles) {
            const positions = this.leafParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i*3+1] -= 0.008;
                if (positions[i*3+1] < 0) {
                    positions[i*3+1] = 18;
                    positions[i*3] = (Math.random() - 0.5) * 80;
                    positions[i*3+2] = (Math.random() - 0.5) * 80;
                }
            }
            this.leafParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Anima vaga-lumes
        const time = Date.now() * 0.003;
        this.fireflies.forEach((fly, idx) => {
            const intensity = 0.2 + Math.sin(time * 2 + idx) * 0.15;
            fly.intensity = intensity;
        });
    }
    
    clear() {
        if (this.leafParticles) {
            if (this.leafParticles.parent) this.leafParticles.parent.remove(this.leafParticles);
            if (this.leafParticles.material) this.leafParticles.material.dispose();
            if (this.leafParticles.geometry) this.leafParticles.geometry.dispose();
            this.leafParticles = null;
        }
        
        if (this.fireflies) {
            this.fireflies.forEach(light => {
                if (light.parent) light.parent.remove(light);
                if (light.dispose) light.dispose();
            });
            this.fireflies = [];
        }
        
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
        this.trees = [];
        this.groundDetails = [];
        this.portal = null;
    }
}