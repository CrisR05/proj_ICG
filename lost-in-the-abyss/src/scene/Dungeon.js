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
        this.textureLoader = new THREE.TextureLoader();
        
        this.walls = [];
        this.crystals = [];
        this.portal = null;
        
        // Caminho vermelho (cristais)
        this.pathGroup = new THREE.Group();
        this.scene.add(this.pathGroup);
        
        // ⭐ Caminho verde (portal) - apenas para debug/deploy
        this.greenPathGroup = new THREE.Group();
        this.scene.add(this.greenPathGroup);
        this.showGreenPath = true;  // Muda para false se quiseres esconder
        
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
    }
    
    generate(levelNumber, theme) {
        // Limpa grupos existentes
        while(this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.walls = [];
        this.crystals = [];
        
        while(this.pathGroup.children.length > 0) {
            this.pathGroup.remove(this.pathGroup.children[0]);
        }
        while(this.greenPathGroup.children.length > 0) {
            this.greenPathGroup.remove(this.greenPathGroup.children[0]);
        }
        
        const size = theme.mapSize;
        const map = this.generateProceduralMap(size, theme.wallDensity);
        this.ensureConnectivity(map, size);
        
        const { floorMaterial, wallMaterial } = this.createMaterials(theme);
        
        const offsetX = (size * this.tileSize) / 2;
        const offsetZ = (size * this.tileSize) / 2;
        
        let farthestPos = null;
        let farthestDist = 0;
        
        // Primeira passagem: chão e paredes
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * this.tileSize - offsetX + this.tileSize/2;
                const z = row * this.tileSize - offsetZ + this.tileSize/2;
                
                const floorGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                const floor = new THREE.Mesh(floorGeo, floorMaterial.clone());
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x, 0, z);
                floor.receiveShadow = true;
                this.group.add(floor);
                
                if (map[row][col] === 1) {
                    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
                    const wall = new THREE.Mesh(wallGeo, wallMaterial.clone());
                    wall.position.set(x, this.wallHeight/2, z);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.group.add(wall);
                    this.walls.push(wall);
                } else if (map[row][col] === 0) {
                    const dist = Math.sqrt(x*x + z*z);
                    if (dist > farthestDist) {
                        farthestDist = dist;
                        farthestPos = new THREE.Vector3(x, 1.0, z);
                    }
                }
            }
        }
        
        // Tecto
        const ceilingGeo = new THREE.PlaneGeometry(size * this.tileSize, size * this.tileSize);
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.9,
            emissive: 0x050505,
            side: THREE.DoubleSide
        });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, this.wallHeight, 0);
        ceiling.receiveShadow = false;
        this.group.add(ceiling);
        
        // Luz de preenchimento
        const fillLight = new THREE.PointLight(0x446688, 0.15, size * this.tileSize * 2);
        fillLight.position.set(0, this.wallHeight / 2, 0);
        fillLight.castShadow = false;
        this.group.add(fillLight);
        
        // ===== COLOCAÇÃO ESTRATÉGICA DE CRISTAIS =====
        // Recolhe todas as células de chão (células vazias) afastadas do centro
        const floorCells = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (map[row][col] === 0) {
                    const x = col * this.tileSize - offsetX + this.tileSize/2;
                    const z = row * this.tileSize - offsetZ + this.tileSize/2;
                    const distFromCenter = Math.sqrt(x*x + z*z);
                    if (distFromCenter > 5) {  // Longe do início
                        floorCells.push({ pos: new THREE.Vector3(x, 1.0, z), row, col });
                    }
                }
            }
        }
        
        // Embaralha as células para aleatoriedade
        floorCells.sort(() => Math.random() - 0.5);
        
        // ⭐ Garante distância mínima entre cristais (evita aglomeração)
        const MIN_CRYSTAL_DISTANCE = 6.0;  // Ajusta conforme o tamanho da tile (tileSize = 4)
        const selectedPositions = [];
        
        for (let cell of floorCells) {
            let tooClose = false;
            for (let existing of selectedPositions) {
                if (cell.pos.distanceTo(existing) < MIN_CRYSTAL_DISTANCE) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) {
                selectedPositions.push(cell.pos);
                if (selectedPositions.length >= theme.totalCrystals) break;
            }
        }
        
        // Se não houver posições suficientes, adiciona as restantes mesmo que perto (fallback)
        if (selectedPositions.length < theme.totalCrystals) {
            for (let cell of floorCells) {
                let alreadySelected = selectedPositions.some(p => p.equals(cell.pos));
                if (!alreadySelected) {
                    selectedPositions.push(cell.pos);
                    if (selectedPositions.length >= theme.totalCrystals) break;
                }
            }
        }
        
        // Cria os cristais nas posições selecionadas
        for (let i = 0; i < selectedPositions.length; i++) {
            const pos = selectedPositions[i];
            const crystal = new Crystal(theme.crystalColor);
            crystal.mesh.position.copy(pos);
            this.group.add(crystal.mesh);
            this.crystals.push(crystal);
        }
        
        console.log(`✨ Cristais colocados: ${this.crystals.length} (distância mínima ${MIN_CRYSTAL_DISTANCE})`);
        
        // Portal na posição mais distante
        if (farthestPos) {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(farthestPos);
            this.portal.mesh.position.y = 1.5;
            this.group.add(this.portal.mesh);
        } else if (floorCells.length > 0) {
            const fallbackPos = floorCells[floorCells.length - 1].pos;
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(fallbackPos);
            this.portal.mesh.position.y = 1.5;
            this.group.add(this.portal.mesh);
        }
        
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        
        console.log(`🗺️ Dungeon gerada: ${size}x${size}, ${this.walls.length} paredes, ${this.crystals.length} cristais`);
    }
    
    // ⭐ MÉTODO PARA CALCULAR CAMINHO ATÉ PORTAL (linha verde)
    calculatePathToPortal(currentPosition) {
        if (!this.portal) return null;
        
        const start = currentPosition.clone();
        const end = this.portal.mesh.position.clone();
        const path = [start];
        const segments = 20;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const point = start.clone().lerp(end, t);
            point.y = 0.1;
            path.push(point);
        }
        return path;
    }
    
    // ⭐ DESENHA O CAMINHO VERDE PARA O PORTAL (apenas se ativado)
    updateGreenPath(playerPosition) {
        if (!this.showGreenPath) return;
        
        while(this.greenPathGroup.children.length > 0) {
            this.greenPathGroup.remove(this.greenPathGroup.children[0]);
        }
        
        const path = this.calculatePathToPortal(playerPosition);
        if (!path || path.length < 2) return;
        
        const material = new THREE.MeshStandardMaterial({ color: 0x33ff33, emissive: 0x116611 });
        
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i+1];
            const dir = new THREE.Vector3().subVectors(p2, p1);
            const length = dir.length();
            const cylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, length, 4),
                material
            );
            cylinder.position.copy(p1.clone().add(p2).multiplyScalar(0.5));
            cylinder.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                dir.clone().normalize()
            );
            this.greenPathGroup.add(cylinder);
        }
        
        // Esfera verde no portal
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x33ff33, emissive: 0x33ff33 })
        );
        marker.position.copy(this.portal.mesh.position);
        marker.position.y = 0.5;
        this.greenPathGroup.add(marker);
    }
    
    // ⭐ CAMINHO VERMELHO PARA CRISTAIS (já existente, mantido)
    calculatePathToNearestCrystal(currentPosition) {
        const availableCrystals = this.crystals.filter(c => !c.collected);
        if (availableCrystals.length === 0) return null;
        
        let nearestCrystal = null;
        let minDist = Infinity;
        for (const crystal of availableCrystals) {
            const dist = currentPosition.distanceTo(crystal.mesh.position);
            if (dist < minDist) {
                minDist = dist;
                nearestCrystal = crystal;
            }
        }
        if (!nearestCrystal) return null;
        
        const start = currentPosition.clone();
        const end = nearestCrystal.mesh.position.clone();
        const path = [start];
        const segments = 20;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const point = start.clone().lerp(end, t);
            point.y = 0.1;
            path.push(point);
        }
        return path;
    }
    
    updatePath(playerPosition) {
        // Caminho vermelho para cristais
        while(this.pathGroup.children.length > 0) {
            this.pathGroup.remove(this.pathGroup.children[0]);
        }
        
        const path = this.calculatePathToNearestCrystal(playerPosition);
        if (path && path.length >= 2) {
            const material = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x441111 });
            for (let i = 0; i < path.length - 1; i++) {
                const p1 = path[i];
                const p2 = path[i+1];
                const dir = new THREE.Vector3().subVectors(p2, p1);
                const length = dir.length();
                const cylinder = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.1, 0.1, length, 4),
                    material
                );
                cylinder.position.copy(p1.clone().add(p2).multiplyScalar(0.5));
                cylinder.quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    dir.clone().normalize()
                );
                this.pathGroup.add(cylinder);
            }
            
            const nearestCrystal = this.crystals.find(c => !c.collected);
            if (nearestCrystal) {
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(0.35, 8, 8),
                    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff2200 })
                );
                marker.position.copy(nearestCrystal.mesh.position);
                marker.position.y = 0.5;
                this.pathGroup.add(marker);
            }
        }
        
        // ⭐ Atualiza também o caminho verde para o portal
        this.updateGreenPath(playerPosition);
    }
    
    // Resto dos métodos (generateProceduralMap, ensureConnectivity, createMaterials, getters) permanecem iguais
    generateProceduralMap(size, wallDensity) {
        // ... (código original inalterado)
        const map = Array(size).fill().map(() => Array(size).fill(1));
        const startX = Math.floor(size / 2);
        const startY = Math.floor(size / 2);
        map[startY][startX] = 0;
        let frontier = [];
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
        for (let [dy, dx] of dirs) {
            const ny = startY + dy;
            const nx = startX + dx;
            if (ny > 0 && ny < size-1 && nx > 0 && nx < size-1) {
                frontier.push([ny, nx, startY, startX]);
            }
        }
        while (frontier.length > 0) {
            const idx = Math.floor(Math.random() * frontier.length);
            const [ny, nx, fromY, fromX] = frontier[idx];
            frontier.splice(idx, 1);
            if (map[ny][nx] === 1) {
                map[ny][nx] = 0;
                map[fromY + (ny - fromY)/2][fromX + (nx - fromX)/2] = 0;
                for (let [dy, dx] of dirs) {
                    const nny = ny + dy;
                    const nnx = nx + dx;
                    if (nny > 0 && nny < size-1 && nnx > 0 && nnx < size-1 && map[nny][nnx] === 1) {
                        frontier.push([nny, nnx, ny, nx]);
                    }
                }
            }
        }
        const targetWalls = Math.floor(size * size * wallDensity);
        let currentWalls = 0;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (map[row][col] === 1) currentWalls++;
            }
        }
        if (currentWalls < targetWalls) {
            const cells = [];
            for (let row = 1; row < size-1; row++) {
                for (let col = 1; col < size-1; col++) {
                    if (map[row][col] === 0) cells.push([row, col]);
                }
            }
            cells.sort(() => Math.random() - 0.5);
            const toAdd = Math.min(targetWalls - currentWalls, cells.length);
            for (let i = 0; i < toAdd; i++) {
                const [row, col] = cells[i];
                map[row][col] = 1;
            }
        }
        for (let i = 0; i < size; i++) {
            map[0][i] = 1;
            map[size-1][i] = 1;
            map[i][0] = 1;
            map[i][size-1] = 1;
        }
        map[startY][startX] = 0;
        return map;
    }
    
    ensureConnectivity(map, size) {
        const visited = Array(size).fill().map(() => Array(size).fill(false));
        const queue = [[Math.floor(size/2), Math.floor(size/2)]];
        visited[Math.floor(size/2)][Math.floor(size/2)] = true;
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        while (queue.length > 0) {
            const [row, col] = queue.shift();
            for (const [dy, dx] of dirs) {
                const nr = row + dy;
                const nc = col + dx;
                if (nr > 0 && nr < size-1 && nc > 0 && nc < size-1 && !visited[nr][nc] && map[nr][nc] === 0) {
                    visited[nr][nc] = true;
                    queue.push([nr, nc]);
                }
            }
        }
        for (let row = 1; row < size-1; row++) {
            for (let col = 1; col < size-1; col++) {
                if (map[row][col] === 0 && !visited[row][col]) {
                    for (const [dy, dx] of dirs) {
                        const nr = row + dy;
                        const nc = col + dx;
                        if (nr > 0 && nr < size-1 && nc > 0 && nc < size-1 && visited[nr][nc]) {
                            map[row][col] = 0;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    createMaterials(theme) {
        const wallType = theme.wallType || 'rough_block_wall';
        const floorType = theme.floorType || 'mossy_rock';
        let wallMaterial, floorMaterial;
        try {
            const wallDiffuse = this.textureLoader.load(`/assets/textures/wall/${wallType}_diff_2k.jpg`);
            const wallRoughness = this.textureLoader.load(`/assets/textures/wall/${wallType}_rough_2k.jpg`);
            const wallNormal = this.textureLoader.load(`/assets/textures/wall/${wallType}_nor_gl_2k.jpg`);
            const floorDiffuse = this.textureLoader.load(`/assets/textures/floor/${floorType}_diff_2k.jpg`);
            const floorRoughness = this.textureLoader.load(`/assets/textures/floor/${floorType}_rough_2k.jpg`);
            const floorNormal = this.textureLoader.load(`/assets/textures/floor/${floorType}_nor_gl_2k.jpg`);
            [wallDiffuse, wallRoughness, wallNormal].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(2, 1);
            });
            [floorDiffuse, floorRoughness, floorNormal].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(3, 3);
            });
            wallMaterial = new THREE.MeshStandardMaterial({
                map: wallDiffuse,
                roughnessMap: wallRoughness,
                normalMap: wallNormal,
                roughness: 0.8,
                metalness: 0.1,
                color: theme.wallColor
            });
            floorMaterial = new THREE.MeshStandardMaterial({
                map: floorDiffuse,
                roughnessMap: floorRoughness,
                normalMap: floorNormal,
                roughness: 0.9,
                metalness: 0.05,
                color: theme.floorColor
            });
            console.log(`✅ Texturas carregadas: ${wallType} / ${floorType}`);
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar texturas: ${error.message}`);
            console.warn('⚠️ Usando fallback procedural');
            const wallTexture = generateStoneTexture(theme.wallColor);
            const floorTexture = generateStoneTexture(theme.floorColor);
            const wallNormalMap = generateNormalMap();
            const floorNormalMap = generateNormalMap();
            [wallTexture, floorTexture, wallNormalMap, floorNormalMap].forEach(tex => {
                if (tex) {
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                }
            });
            wallTexture.repeat.set(2, 1);
            floorTexture.repeat.set(3, 3);
            if (wallNormalMap) wallNormalMap.repeat.set(2, 1);
            if (floorNormalMap) floorNormalMap.repeat.set(3, 3);
            wallMaterial = new THREE.MeshStandardMaterial({
                map: wallTexture,
                normalMap: wallNormalMap,
                color: theme.wallColor,
                roughness: 0.8,
                metalness: 0.1
            });
            floorMaterial = new THREE.MeshStandardMaterial({
                map: floorTexture,
                normalMap: floorNormalMap,
                color: theme.floorColor,
                roughness: 0.9,
                metalness: 0.05
            });
        }
        return { floorMaterial, wallMaterial };
    }
    
    getStartPosition() { return this.startPosition; }
    getWalls() { return this.walls; }
    getCrystals() { return this.crystals; }
    getPortal() { return this.portal; }
}