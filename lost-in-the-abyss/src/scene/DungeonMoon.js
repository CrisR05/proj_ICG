import * as THREE from 'three';
import { Crystal } from '../entities/Crystal.js';
import { Portal } from '../entities/Portal.js';
import { GAME_CONFIG } from '../utils/constants.js';

export class DungeonMoon {
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
        
        this.startPosition = new THREE.Vector3(0, this.playerHeight, 0);
        
        // Elementos lunares/espaciais
        this.dustParticles = null;
        this.stars = null;
        this.spaceships = [];
        this.ufos = [];
        this.satellites = [];
        this.meteors = [];
        this.pulsingLights = [];
        this.lunarRovers = [];
        this.astronautStatues = [];
    }
    
    generate(levelNumber, theme) {
        this.clear();
        
        const size = theme.mapSize;
        const map = this.generateLunarMaze(size, theme.wallDensity);
        this.ensureConnectivity(map, size);
        
        const { floorMaterial, wallMaterial } = this.createLunarMaterials(theme);
        const offsetX = (size * this.tileSize) / 2;
        const offsetZ = (size * this.tileSize) / 2;
        
        let farthestPos = null;
        let farthestDist = 0;
        
        // ===== CONSTRUÇÃO DO LABIRINTO LUNAR =====
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                // Chão lunar com crateras
                const floorGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                const floor = new THREE.Mesh(floorGeo, floorMaterial.clone());
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x, 0, z);
                floor.receiveShadow = true;
                this.group.add(floor);
                
                // Adiciona crateras no chão
                this.addMoonCrater(x, z, row, col);
                
                if (map[row][col] === 1) {
                    // Paredes lunares com cristais
                    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
                    const wall = new THREE.Mesh(wallGeo, wallMaterial.clone());
                    wall.position.set(x, this.wallHeight / 2, z);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.group.add(wall);
                    this.walls.push(wall);
                    
                    this.addMoonCrystals(wall, x, z);
                    this.addLunarMarkings(wall, x, z);
                } else if (map[row][col] === 0) {
                    const dist = Math.sqrt(x * x + z * z);
                    if (dist > farthestDist) {
                        farthestDist = dist;
                        farthestPos = new THREE.Vector3(x, this.playerHeight, z);
                    }
                }
            }
        }
        
        // ===== ELEMENTOS ESPACIAIS =====
        this.createStarrySky(theme);
        this.setupMoonLighting(theme);
        this.addFloatingRocks(theme, size, offsetX, offsetZ);
        this.createMoonDust(theme);
        
        // ===== NAVES ESPACIAIS (vários tipos) =====
        this.createSpaceships(size, offsetX, offsetZ);
        this.createUFOS(size, offsetX, offsetZ);
        this.createSatellites(size, offsetX, offsetZ);
        this.createMeteors(size, offsetX, offsetZ);
        
        // ===== ELEMENTOS LUNARES DECORATIVOS =====
        this.addLunarRovers(map, size, offsetX, offsetZ);
        this.addAstronautStatues(map, size, offsetX, offsetZ);
        this.addLunarTelescopes(map, size, offsetX, offsetZ);
        this.addMoonRocksAndBoulders(map, size, offsetX, offsetZ);
        this.addLunarPillars(map, size, offsetX, offsetZ);
        this.addAlienMonoliths(map, size, offsetX, offsetZ);
        
        // ===== CRISTAIS E PORTAL =====
        this.placeLunarCrystals(theme, size, offsetX, offsetZ, map);
        this.placeLunarPortal(theme, farthestPos);
        
        this.startPosition = new THREE.Vector3(0, this.playerHeight, 0);
        
        console.log(`🌕 Lua gerada: ${size}x${size}, ${this.walls.length} paredes, ${this.crystals.length} cristais, ${this.spaceships.length} naves`);
    }
    
    // ===== CRATERAS LUNARES =====
    addMoonCrater(x, z, row, col) {
        if (Math.random() > 0.92) {
            const craterMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.9 });
            const craterRadius = 0.4 + Math.random() * 0.3;
            const crater = new THREE.Mesh(new THREE.CylinderGeometry(craterRadius, craterRadius * 1.2, 0.05, 16), craterMat);
            crater.position.set(x, -0.02, z);
            crater.receiveShadow = true;
            this.group.add(crater);
            
            // Borda da cratera
            const rimMat = new THREE.MeshStandardMaterial({ color: 0x999aaa });
            const rim = new THREE.Mesh(new THREE.TorusGeometry(craterRadius + 0.05, 0.05, 16, 32), rimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(x, 0, z);
            rim.receiveShadow = true;
            this.group.add(rim);
        }
    }
    
    // ===== MARCAS LUNARES NAS PAREDES =====
    addLunarMarkings(wall, x, z) {
        if (Math.random() > 0.85) {
            const markingMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, emissive: 0x224466, emissiveIntensity: 0.3 });
            const marking = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), markingMat);
            marking.position.set(
                (Math.random() - 0.5) * 1.2,
                Math.random() * 4,
                (Math.random() - 0.5) * 1.2
            );
            marking.castShadow = true;
            wall.add(marking);
        }
    }
    
    // ===== NAVES ESPACIAIS (tipo nave estelar) =====
    createSpaceships(size, offsetX, offsetZ) {
        const shipCount = 5 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < shipCount; i++) {
            const shipGroup = new THREE.Group();
            
            // Corpo principal
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, metalness: 0.9, roughness: 0.3 });
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.2, 8), bodyMat);
            body.rotation.x = Math.PI / 2;
            body.castShadow = true;
            shipGroup.add(body);
            
            // Asas
            const wingMat = new THREE.MeshStandardMaterial({ color: 0xaaccff, metalness: 0.85 });
            const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.3), wingMat);
            leftWing.position.set(-0.5, 0, 0);
            leftWing.castShadow = true;
            shipGroup.add(leftWing);
            
            const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.3), wingMat);
            rightWing.position.set(0.5, 0, 0);
            rightWing.castShadow = true;
            shipGroup.add(rightWing);
            
            // Cabina
            const cabinMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x2266aa, emissiveIntensity: 0.5 });
            const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8), cabinMat);
            cabin.position.set(0, 0.2, 0.4);
            cabin.castShadow = true;
            shipGroup.add(cabin);
            
            // Motor traseiro (luz)
            const engineLight = new THREE.PointLight(0xff6600, 0.8, 12);
            engineLight.position.set(0, 0, -0.6);
            shipGroup.add(engineLight);
            
            // Propulsão (chama)
            const flameMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200 });
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), flameMat);
            flame.position.set(0, 0, -0.8);
            flame.castShadow = true;
            shipGroup.add(flame);
            
            // Posição e movimento
            const startX = (Math.random() - 0.5) * 120;
            const startZ = (Math.random() - 0.5) * 120;
            const startY = 8 + Math.random() * 15;
            
            shipGroup.position.set(startX, startY, startZ);
            shipGroup.userData = {
                speed: 3 + Math.random() * 4,
                direction: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 2
                ).normalize(),
                rotationSpeed: 0.01 + Math.random() * 0.02,
                engineLight: engineLight,
                flame: flame,
                pulseTime: Math.random() * Math.PI * 2
            };
            
            this.group.add(shipGroup);
            this.spaceships.push(shipGroup);
        }
    }
    
    // ===== OVNIs =====
    createUFOS(size, offsetX, offsetZ) {
        const ufoCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < ufoCount; i++) {
            const ufoGroup = new THREE.Group();
            
            // Corpo (disco)
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, metalness: 0.7, roughness: 0.4 });
            const body = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 16, 32), bodyMat);
            body.rotation.x = Math.PI / 2;
            body.castShadow = true;
            ufoGroup.add(body);
            
            const domeMat = new THREE.MeshStandardMaterial({ color: 0xaaffcc, emissive: 0x44aa88, emissiveIntensity: 0.4 });
            const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16), domeMat);
            dome.position.y = 0.15;
            dome.castShadow = true;
            ufoGroup.add(dome);
            
            // Luzes do OVNI
            const lightMat = new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0xff4400 });
            for (let a = 0; a < 6; a++) {
                const angle = (a / 6) * Math.PI * 2;
                const lightSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6), lightMat);
                lightSphere.position.set(Math.cos(angle) * 0.65, -0.05, Math.sin(angle) * 0.65);
                ufoGroup.add(lightSphere);
            }
            
            // Luz principal
            const ufoLight = new THREE.PointLight(0x88ffaa, 0.6, 15);
            ufoLight.position.set(0, 0.1, 0);
            ufoGroup.add(ufoLight);
            
            const startX = (Math.random() - 0.5) * 100;
            const startZ = (Math.random() - 0.5) * 100;
            ufoGroup.position.set(startX, 12 + Math.random() * 12, startZ);
            
            ufoGroup.userData = {
                speed: 2 + Math.random() * 3,
                direction: new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.3) * 0.3,
                    (Math.random() - 0.5) * 1.5
                ).normalize(),
                wobbleSpeed: 0.02 + Math.random() * 0.02,
                wobbleAmount: 0.2,
                light: ufoLight,
                time: Math.random() * Math.PI * 2
            };
            
            this.group.add(ufoGroup);
            this.ufos.push(ufoGroup);
        }
    }
    
    // ===== SATÉLITES =====
    createSatellites(size, offsetX, offsetZ) {
        const satCount = 4 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < satCount; i++) {
            const satGroup = new THREE.Group();
            
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xccddff, metalness: 0.85 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), bodyMat);
            body.castShadow = true;
            satGroup.add(body);
            
            // Painéis solares
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, metalness: 0.7 });
            const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), panelMat);
            leftPanel.position.set(-0.6, 0, 0);
            leftPanel.castShadow = true;
            satGroup.add(leftPanel);
            
            const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), panelMat);
            rightPanel.position.set(0.6, 0, 0);
            rightPanel.castShadow = true;
            satGroup.add(rightPanel);
            
            // Antena
            const antennaMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
            const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 4), antennaMat);
            antenna.position.set(0, 0.3, 0);
            satGroup.add(antenna);
            
            const startX = (Math.random() - 0.5) * 90;
            const startZ = (Math.random() - 0.5) * 90;
            satGroup.position.set(startX, 10 + Math.random() * 14, startZ);
            
            satGroup.userData = {
                speed: 1.5 + Math.random() * 2,
                direction: new THREE.Vector3(
                    (Math.random() - 0.5) * 1.2,
                    0.1 + Math.random() * 0.2,
                    (Math.random() - 0.5) * 1.2
                ).normalize(),
                rotationSpeed: 0.01
            };
            
            this.group.add(satGroup);
            this.satellites.push(satGroup);
        }
    }
    
    // ===== METEOROS =====
    createMeteors(size, offsetX, offsetZ) {
        const meteorCount = 8 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < meteorCount; i++) {
            const meteorMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, roughness: 0.7, metalness: 0.3 });
            const meteor = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2), meteorMat);
            
            const startX = (Math.random() - 0.5) * 130;
            const startZ = (Math.random() - 0.5) * 130;
            meteor.position.set(startX, 15 + Math.random() * 20, startZ);
            meteor.castShadow = true;
            
            meteor.userData = {
                speed: 5 + Math.random() * 6,
                direction: new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    -0.5 - Math.random() * 0.5,
                    (Math.random() - 0.5) * 1.5
                ).normalize(),
                trail: []
            };
            
            // Rastro do meteoro (partículas)
            const trailMat = new THREE.PointsMaterial({ color: 0xff8844, size: 0.05 });
            const trailCount = 20;
            const trailGeometry = new THREE.BufferGeometry();
            const trailPositions = new Float32Array(trailCount * 3);
            for (let t = 0; t < trailCount; t++) {
                trailPositions[t*3] = meteor.position.x;
                trailPositions[t*3+1] = meteor.position.y;
                trailPositions[t*3+2] = meteor.position.z;
            }
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
            const trail = new THREE.Points(trailGeometry, trailMat);
            meteor.add(trail);
            meteor.userData.trailPoints = trailPositions;
            meteor.userData.trailGeometry = trailGeometry;
            
            this.group.add(meteor);
            this.meteors.push(meteor);
        }
    }
    
    // ===== ROVERS LUNARES =====
    addLunarRovers(map, size, offsetX, offsetZ) {
        const roverMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, metalness: 0.7 });
        const roverCount = 6 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < roverCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.75) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const roverGroup = new THREE.Group();
                
                // Corpo
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.8), roverMat);
                body.position.y = 0.1;
                body.castShadow = true;
                roverGroup.add(body);
                
                // Rodas
                const wheelMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
                for (let w = -0.4; w <= 0.4; w += 0.4) {
                    for (let d = -0.5; d <= 0.5; d += 1) {
                        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8), wheelMat);
                        wheel.rotation.z = Math.PI / 2;
                        wheel.position.set(w, 0.05, d);
                        wheel.castShadow = true;
                        roverGroup.add(wheel);
                    }
                }
                
                // Antena
                const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 4), roverMat);
                antenna.position.set(0, 0.25, 0.3);
                roverGroup.add(antenna);
                
                roverGroup.position.set(x, 0, z);
                roverGroup.rotation.y = Math.random() * Math.PI * 2;
                this.group.add(roverGroup);
                this.lunarRovers.push(roverGroup);
            }
        }
    }
    
    // ===== ESTÁTUAS DE ASTRONAUTAS =====
    addAstronautStatues(map, size, offsetX, offsetZ) {
        const astronautMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.6 });
        const astronautCount = 4 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < astronautCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.85) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const astronautGroup = new THREE.Group();
                
                // Corpo
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 8), astronautMat);
                body.position.y = 0.4;
                body.castShadow = true;
                astronautGroup.add(body);
                
                // Cabeça (capacete)
                const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16), astronautMat);
                helmet.position.y = 0.85;
                helmet.castShadow = true;
                astronautGroup.add(helmet);
                
                // Visor
                const visorMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, metalness: 0.9 });
                const visor = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8), visorMat);
                visor.position.set(0.15, 0.85, 0.12);
                astronautGroup.add(visor);
                
                // Mochila (jetpack)
                const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), astronautMat);
                backpack.position.set(0, 0.5, -0.25);
                astronautGroup.add(backpack);
                
                astronautGroup.position.set(x, 0, z);
                astronautGroup.rotation.y = Math.random() * Math.PI * 2;
                this.group.add(astronautGroup);
                this.astronautStatues.push(astronautGroup);
            }
        }
    }
    
    // ===== TELESCÓPIOS LUNARES =====
    addLunarTelescopes(map, size, offsetX, offsetZ) {
        const telescopeMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, metalness: 0.6 });
        const telescopeCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < telescopeCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.9) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const telescopeGroup = new THREE.Group();
                
                // Tripé
                for (let leg = 0; leg < 3; leg++) {
                    const angle = (leg / 3) * Math.PI * 2;
                    const legMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
                    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 4), legMat);
                    legMesh.position.set(Math.cos(angle) * 0.3, 0.25, Math.sin(angle) * 0.3);
                    legMesh.castShadow = true;
                    telescopeGroup.add(legMesh);
                }
                
                // Corpo do telescópio
                const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8), telescopeMat);
                tube.rotation.x = Math.PI / 3;
                tube.position.set(0, 0.55, 0.2);
                tube.castShadow = true;
                telescopeGroup.add(tube);
                
                // Lente
                const lensMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, metalness: 0.8 });
                const lens = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8), lensMat);
                lens.position.set(0, 0.82, 0.45);
                telescopeGroup.add(lens);
                
                telescopeGroup.position.set(x, 0, z);
                telescopeGroup.rotation.y = Math.random() * Math.PI * 2;
                this.group.add(telescopeGroup);
            }
        }
    }
    
    // ===== ROCHAS E BOULDERS LUNARES =====
    addMoonRocksAndBoulders(map, size, offsetX, offsetZ) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.85 });
        const rockCount = Math.floor(size * 1.5);
        
        for (let i = 0; i < rockCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.7) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.12), rockMat);
                rock.scale.set(1, 0.6 + Math.random() * 0.5, 1);
                rock.position.set(x, 0.08, z);
                rock.castShadow = true;
                this.group.add(rock);
            }
        }
    }
    
    // ===== PILARES LUNARES =====
    addLunarPillars(map, size, offsetX, offsetZ) {
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.4, roughness: 0.7 });
        const pillarCount = Math.floor(size * 0.8);
        
        for (let i = 0; i < pillarCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.85) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.5, 8), pillarMat);
                pillar.position.set(x, 1.25, z);
                pillar.castShadow = true;
                this.group.add(pillar);
                
                // Cristal no topo
                const crystalMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x224466 });
                const topCrystal = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 6), crystalMat);
                topCrystal.position.set(x, 2.55, z);
                topCrystal.castShadow = true;
                this.group.add(topCrystal);
            }
        }
    }
    
    // ===== MONOLITOS ALIENÍGENAS =====
    addAlienMonoliths(map, size, offsetX, offsetZ) {
        const monolithMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.8, emissive: 0x112233 });
        const monolithCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < monolithCount; i++) {
            const row = 2 + Math.floor(Math.random() * (size - 4));
            const col = 2 + Math.floor(Math.random() * (size - 4));
            
            if (map[row][col] === 0 && Math.random() > 0.9) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const monolith = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.0, 0.6), monolithMat);
                monolith.position.set(x, 1.0, z);
                monolith.castShadow = true;
                this.group.add(monolith);
                
                // Glifo brilhante
                const glyphMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488aa });
                const glyph = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6), glyphMat);
                glyph.position.set(x, 1.5, z + 0.31);
                monolith.add(glyph);
                
                // Luz pulsante
                const monolithLight = new THREE.PointLight(0x88aaff, 0.5, 10);
                monolithLight.position.set(x, 1.2, z);
                this.group.add(monolithLight);
                this.pulsingLights.push(monolithLight);
            }
        }
    }
    
    createLunarMaterials(theme) {
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa, 
            roughness: 0.85, 
            metalness: 0.15 
        });
        
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888899, 
            roughness: 0.8, 
            metalness: 0.1 
        });
        
        return { floorMaterial, wallMaterial };
    }
    
    addMoonCrystals(wall, x, z) {
        if (Math.random() > 0.85) {
            const crystalMat = new THREE.MeshStandardMaterial({ 
                color: 0x88aaff, 
                emissive: 0x224466, 
                emissiveIntensity: 0.4,
                metalness: 0.8
            });
            const crystal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), crystalMat);
            crystal.position.set(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 3.5,
                (Math.random() - 0.5) * 1.5 + 0.5
            );
            crystal.castShadow = true;
            wall.add(crystal);
        }
    }
    
    createStarrySky(theme) {
        this.scene.background = new THREE.Color(0x030310);
        
        // Estrelas distantes
        const starCount = 2500;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            starPositions[i*3] = (Math.random() - 0.5) * 500;
            starPositions[i*3+1] = (Math.random() - 0.5) * 250 + 30;
            starPositions[i*3+2] = (Math.random() - 0.5) * 200 - 150;
            
            const colorVal = 0.7 + Math.random() * 0.3;
            starColors[i*3] = colorVal;
            starColors[i*3+1] = colorVal;
            starColors[i*3+2] = colorVal;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        const starMaterial = new THREE.PointsMaterial({ size: 0.12, vertexColors: true });
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.group.add(this.stars);
        
        // Nebulosas
        const nebulaMat = new THREE.MeshStandardMaterial({ color: 0x553388, emissive: 0x331166, transparent: true, opacity: 0.25 });
        const nebula = new THREE.Mesh(new THREE.SphereGeometry(35, 20, 20), nebulaMat);
        nebula.position.set(-50, 25, -80);
        this.group.add(nebula);
        
        const nebula2Mat = new THREE.MeshStandardMaterial({ color: 0x335588, emissive: 0x224466, transparent: true, opacity: 0.2 });
        const nebula2 = new THREE.Mesh(new THREE.SphereGeometry(28, 18, 18), nebula2Mat);
        nebula2.position.set(45, 20, -70);
        this.group.add(nebula2);
        
        // Planeta Terra ao fundo
        const earthMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x224466 });
        const earth = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 32), earthMat);
        earth.position.set(-45, 15, -90);
        this.group.add(earth);
        
        this.scene.fog = new THREE.FogExp2(0x050518, 0.006);
    }
    
    setupMoonLighting(theme) {
        const ambientLight = new THREE.AmbientLight(0x334455, 0.3);
        this.group.add(ambientLight);
        
        const moonLight = new THREE.DirectionalLight(0xaaccff, 0.9);
        moonLight.position.set(-10, 25, 15);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 1024;
        moonLight.shadow.mapSize.height = 1024;
        this.group.add(moonLight);
        
        const backLight = new THREE.PointLight(0x6688aa, 0.4);
        backLight.position.set(0, 15, -25);
        this.group.add(backLight);
        
        // Luzes pulsantes espalhadas
        for (let i = 0; i < 12; i++) {
            const light = new THREE.PointLight(0x88aaff, 0.35, 18);
            light.position.set(
                (Math.random() - 0.5) * 50,
                1.5 + Math.random() * 5,
                (Math.random() - 0.5) * 50
            );
            this.group.add(light);
            this.pulsingLights.push(light);
        }
    }
    
    addFloatingRocks(theme, size, offsetX, offsetZ) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.7, metalness: 0.2 });
        const rockCount = 40;
        
        for (let i = 0; i < rockCount; i++) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.3), rockMat);
            rock.position.set(
                (Math.random() - 0.5) * size * this.tileSize,
                2.5 + Math.random() * 6,
                (Math.random() - 0.5) * size * this.tileSize
            );
            rock.castShadow = true;
            this.group.add(rock);
            rock.userData = { floatSpeed: 0.4 + Math.random(), floatOffset: Math.random() * Math.PI * 2, originalY: rock.position.y };
        }
    }
    
    createMoonDust(theme) {
        const dustCount = 1200;
        const dustGeometry = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustColors = new Float32Array(dustCount * 3);
        
        for (let i = 0; i < dustCount; i++) {
            dustPositions[i*3] = (Math.random() - 0.5) * 80;
            dustPositions[i*3+1] = Math.random() * 6;
            dustPositions[i*3+2] = (Math.random() - 0.5) * 80;
            
            const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.4, 0.65);
            dustColors[i*3] = color.r;
            dustColors[i*3+1] = color.g;
            dustColors[i*3+2] = color.b;
        }
        
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
        
        const dustMat = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending });
        this.dustParticles = new THREE.Points(dustGeometry, dustMat);
        this.group.add(this.dustParticles);
    }
    
    generateLunarMaze(size, wallDensity) {
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
        
        const targetWalls = Math.floor(size*size * (wallDensity * 0.65));
        let currentWalls = 0;
        for (let row=0; row<size; row++) for (let col=0; col<size; col++) if (map[row][col]===1) currentWalls++;
        
        if (currentWalls < targetWalls) {
            const cells = [];
            for (let row=1; row<size-1; row++) for (let col=1; col<size-1; col++) if (map[row][col]===0) cells.push([row,col]);
            cells.sort(()=>Math.random()-0.5);
            const toAdd = Math.min(targetWalls-currentWalls, cells.length);
            for (let i=0; i<toAdd; i++) { const [r,c]=cells[i]; map[r][c]=1; }
        }
        
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
    
    placeLunarCrystals(theme, size, offsetX, offsetZ, map) {
        const floorCells = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (map[row][col] === 0) {
                    const x = col * this.tileSize - offsetX + this.tileSize/2;
                    const z = row * this.tileSize - offsetZ + this.tileSize/2;
                    const distFromCenter = Math.sqrt(x*x + z*z);
                    if (distFromCenter > 5) {
                        floorCells.push(new THREE.Vector3(x, this.playerHeight * 0.5, z));
                    }
                }
            }
        }
        
        floorCells.sort(() => Math.random() - 0.5);
        const crystalCount = Math.min(theme.totalCrystals, floorCells.length);
        const MOON_COLORS = [0x88aaff, 0xaa88ff, 0x88ccff, 0xccccff, 0x99aaff, 0xff88cc];
        
        for (let i = 0; i < crystalCount; i++) {
            const pos = floorCells[i];
            const crystalColor = MOON_COLORS[i % MOON_COLORS.length];
            const crystal = new Crystal(crystalColor, 0.55);
            crystal.mesh.position.copy(pos);
            this.group.add(crystal.mesh);
            this.crystals.push(crystal);
        }
    }
    
    placeLunarPortal(theme, farthestPos) {
        if (farthestPos) {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(farthestPos);
            this.portal.mesh.position.y = this.playerHeight * 0.6;
            this.group.add(this.portal.mesh);
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
            const material = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x224466 });
            
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
        
        // Anima partículas de poeira
        if (this.dustParticles) {
            const positions = this.dustParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i*3+1] += 0.0015;
                if (positions[i*3+1] > 5.5) {
                    positions[i*3+1] = 0;
                }
            }
            this.dustParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Anima luzes pulsantes
        const time = Date.now() * 0.002;
        this.pulsingLights.forEach((light, idx) => {
            const intensity = 0.25 + Math.sin(time * 1.8 + idx) * 0.2;
            light.intensity = intensity;
        });
        
        // Anima estrelas (rotação lenta)
        if (this.stars) {
            this.stars.rotation.y += 0.0003;
            this.stars.rotation.x += 0.0001;
        }
        
        // Anima naves espaciais
        const bounds = 70;
        this.spaceships.forEach(ship => {
            const data = ship.userData;
            ship.position.x += data.direction.x * data.speed * 0.016;
            ship.position.z += data.direction.z * data.speed * 0.016;
            ship.position.y += data.direction.y * data.speed * 0.008;
            
            // Rotação suave
            ship.rotation.y += data.rotationSpeed;
            ship.rotation.x = Math.sin(time) * 0.1;
            
            // Piscar da chama
            if (data.flame) {
                const scale = 0.8 + Math.sin(time * 15) * 0.3;
                data.flame.scale.set(scale, scale, scale);
            }
            
            // Luz do motor pulsante
            if (data.engineLight) {
                data.engineLight.intensity = 0.5 + Math.sin(time * 20) * 0.3;
            }
            
            // Reset se sair dos limites
            if (Math.abs(ship.position.x) > bounds || Math.abs(ship.position.z) > bounds) {
                ship.position.x = (Math.random() - 0.5) * bounds * 1.5;
                ship.position.z = (Math.random() - 0.5) * bounds * 1.5;
                ship.position.y = 8 + Math.random() * 15;
                data.direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 2
                ).normalize();
            }
        });
        
        // Anima OVNIs
        this.ufos.forEach(ufo => {
            const data = ufo.userData;
            ufo.position.x += data.direction.x * data.speed * 0.016;
            ufo.position.z += data.direction.z * data.speed * 0.016;
            ufo.position.y += Math.sin(data.time) * 0.02;
            
            data.time += data.wobbleSpeed;
            
            // Rotação suave
            ufo.rotation.y += 0.01;
            ufo.rotation.z = Math.sin(data.time * 2) * 0.1;
            
            // Luz pulsante
            if (data.light) {
                data.light.intensity = 0.4 + Math.sin(time * 3) * 0.3;
            }
            
            if (Math.abs(ufo.position.x) > bounds || Math.abs(ufo.position.z) > bounds) {
                ufo.position.x = (Math.random() - 0.5) * bounds * 1.5;
                ufo.position.z = (Math.random() - 0.5) * bounds * 1.5;
                data.direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.3) * 0.3,
                    (Math.random() - 0.5) * 1.5
                ).normalize();
            }
        });
        
        // Anima satélites
        this.satellites.forEach(sat => {
            const data = sat.userData;
            sat.position.x += data.direction.x * data.speed * 0.016;
            sat.position.z += data.direction.z * data.speed * 0.016;
            sat.rotation.x += data.rotationSpeed;
            sat.rotation.z += data.rotationSpeed * 0.5;
            
            if (Math.abs(sat.position.x) > bounds + 10 || Math.abs(sat.position.z) > bounds + 10) {
                sat.position.x = (Math.random() - 0.5) * bounds;
                sat.position.z = (Math.random() - 0.5) * bounds;
            }
        });
        
        // Anima meteoros
        this.meteors.forEach(meteor => {
            const data = meteor.userData;
            meteor.position.x += data.direction.x * data.speed * 0.016;
            meteor.position.y += data.direction.y * data.speed * 0.016;
            meteor.position.z += data.direction.z * data.speed * 0.016;
            meteor.rotation.x += 0.05;
            meteor.rotation.y += 0.07;
            
            // Atualiza rastro
            if (data.trailPoints && data.trailGeometry) {
                const positions = data.trailGeometry.attributes.position.array;
                for (let i = positions.length - 3; i >= 3; i -= 3) {
                    positions[i] = positions[i-3];
                    positions[i+1] = positions[i-2];
                    positions[i+2] = positions[i-1];
                }
                positions[0] = meteor.position.x;
                positions[1] = meteor.position.y;
                positions[2] = meteor.position.z;
                data.trailGeometry.attributes.position.needsUpdate = true;
            }
            
            // Reset se sair dos limites
            if (Math.abs(meteor.position.x) > bounds + 20 || 
                Math.abs(meteor.position.z) > bounds + 20 ||
                meteor.position.y < -5) {
                meteor.position.x = (Math.random() - 0.5) * bounds * 1.5;
                meteor.position.z = (Math.random() - 0.5) * bounds * 1.5;
                meteor.position.y = 18 + Math.random() * 15;
                data.direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    -0.5 - Math.random() * 0.5,
                    (Math.random() - 0.5) * 1.5
                ).normalize();
            }
        });
    }
    
    clear() {
        // Remove luzes
        if (this.pulsingLights) {
            this.pulsingLights.forEach(light => {
                if (light.parent) light.parent.remove(light);
            });
            this.pulsingLights = [];
        }
        
        // Remove naves
        this.spaceships.forEach(ship => { if (ship.parent) ship.parent.remove(ship); });
        this.spaceships = [];
        
        this.ufos.forEach(ufo => { if (ufo.parent) ufo.parent.remove(ufo); });
        this.ufos = [];
        
        this.satellites.forEach(sat => { if (sat.parent) sat.parent.remove(sat); });
        this.satellites = [];
        
        this.meteors.forEach(meteor => { if (meteor.parent) meteor.parent.remove(meteor); });
        this.meteors = [];
        
        this.lunarRovers.forEach(rover => { if (rover.parent) rover.parent.remove(rover); });
        this.lunarRovers = [];
        
        this.astronautStatues.forEach(statue => { if (statue.parent) statue.parent.remove(statue); });
        this.astronautStatues = [];
        
        if (this.stars) {
            if (this.stars.parent) this.stars.parent.remove(this.stars);
            this.stars = null;
        }
        
        if (this.dustParticles) {
            if (this.dustParticles.parent) this.dustParticles.parent.remove(this.dustParticles);
            this.dustParticles = null;
        }
        
        // Limpa grupos
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
        this.portal = null;
    }
}