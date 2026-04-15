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
        
        this.walls = [];        // Para colisões
        this.crystals = [];
        this.portal = null;
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
    }
    
    generate(levelNumber, theme) {
    // Limpa o grupo existente
    while(this.group.children.length > 0) {
        this.group.remove(this.group.children[0]);
    }
    this.walls = [];
    this.crystals = [];
    
    const size = theme.mapSize;
    
    // Geração procedural do mapa
    const map = this.generateProceduralMap(size, theme.wallDensity);
    
    // Garante que há caminho até a saída
    this.ensureConnectivity(map, size);
    
    // Cria materiais com texturas e Normal Maps
    const { floorMaterial, wallMaterial } = this.createMaterials(theme);
    
    // Constrói geometria
    const offsetX = (size * this.tileSize) / 2;
    const offsetZ = (size * this.tileSize) / 2;
    
    let farthestPos = null;
    let farthestDist = 0;
    
    // Primeiro passa: chão e paredes
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const x = col * this.tileSize - offsetX + this.tileSize/2;
            const z = row * this.tileSize - offsetZ + this.tileSize/2;
            
            // Chão
            const floorGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
            const floor = new THREE.Mesh(floorGeo, floorMaterial.clone());
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(x, 0, z);
            floor.receiveShadow = true;
            this.group.add(floor);
            
            // Parede
            if (map[row][col] === 1) {
                const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
                const wall = new THREE.Mesh(wallGeo, wallMaterial.clone());
                wall.position.set(x, this.wallHeight/2, z);
                wall.castShadow = true;
                wall.receiveShadow = true;
                this.group.add(wall);
                this.walls.push(wall);
            } else if (map[row][col] === 0) {
                // Célula vazia - candidata a cristal ou saída
                const dist = Math.sqrt(x*x + z*z);
                if (dist > farthestDist) {
                    farthestDist = dist;
                    farthestPos = new THREE.Vector3(x, 1.0, z);
                }
            }
        }
    }
    
    // ===== TETO (CORREÇÃO: Impede ver o "céu") =====
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
    
    // ===== LUZ DE PREENCHIMENTO (Ajuda a ver texturas sem estragar atmosfera) =====
    const fillLight = new THREE.PointLight(0x446688, 0.15, size * this.tileSize * 2);
    fillLight.position.set(0, this.wallHeight / 2, 0);
    fillLight.castShadow = false;
    this.group.add(fillLight);
    
    // Encontra posições para cristais (células 0 distantes)
    const floorCells = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (map[row][col] === 0) {
                const x = col * this.tileSize - offsetX + this.tileSize/2;
                const z = row * this.tileSize - offsetZ + this.tileSize/2;
                const distFromCenter = Math.sqrt(x*x + z*z);
                if (distFromCenter > 5) {
                    floorCells.push(new THREE.Vector3(x, 1.0, z));
                }
            }
        }
    }
    
    // Embaralha e seleciona posições para cristais
    floorCells.sort(() => Math.random() - 0.5);
    const crystalCount = Math.min(theme.totalCrystals, floorCells.length);
    
    for (let i = 0; i < crystalCount; i++) {
        const pos = floorCells[i];
        const crystal = new Crystal(theme.crystalColor);
        crystal.mesh.position.copy(pos);
        this.group.add(crystal.mesh);
        this.crystals.push(crystal);
    }
    
    // Portal na posição mais distante (CORREÇÃO: typo farthestPos → farthestPos)
    if (farthestPos) {
        this.portal = new Portal(theme.portalColor);
        this.portal.mesh.position.copy(farthestPos);
        this.portal.mesh.position.y = 1.5;
        this.group.add(this.portal.mesh);
    } else if (floorCells.length > 0) {
        // Fallback: se não encontrou farthestPos, usa a última célula
        const fallbackPos = floorCells[floorCells.length - 1];
        this.portal = new Portal(theme.portalColor);
        this.portal.mesh.position.copy(fallbackPos);
        this.portal.mesh.position.y = 1.5;
        this.group.add(this.portal.mesh);
    }
    
    // Posição inicial (centro)
    this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
    
    console.log(`🗺️ Dungeon gerada: ${size}x${size}, ${this.walls.length} paredes, ${this.crystals.length} cristais`);
}
    
   generateProceduralMap(size, wallDensity) {
    // Inicializa TUDO como parede (1)
    const map = Array(size).fill().map(() => Array(size).fill(1));
    
    // Começa no centro
    const startX = Math.floor(size / 2);
    const startY = Math.floor(size / 2);
    map[startY][startX] = 0;
    
    // Lista de paredes candidatas a serem escavadas (para criar corredores)
    let frontier = [];
    
    // Adiciona vizinhos do centro à fronteira
    const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
    for (let [dy, dx] of dirs) {
        const ny = startY + dy;
        const nx = startX + dx;
        if (ny > 0 && ny < size-1 && nx > 0 && nx < size-1) {
            frontier.push([ny, nx, startY, startX]);
        }
    }
    
    // Algoritmo de Prim para gerar labirinto perfeito
    while (frontier.length > 0) {
        // Escolhe aleatoriamente uma parede da fronteira
        const idx = Math.floor(Math.random() * frontier.length);
        const [ny, nx, fromY, fromX] = frontier[idx];
        frontier.splice(idx, 1);
        
        // Se ainda é parede, escava
        if (map[ny][nx] === 1) {
            // Escava a célula atual
            map[ny][nx] = 0;
            // Escava a célula do meio (conecta ao corredor existente)
            map[fromY + (ny - fromY)/2][fromX + (nx - fromX)/2] = 0;
            
            // Adiciona novos vizinhos à fronteira
            for (let [dy, dx] of dirs) {
                const nny = ny + dy;
                const nnx = nx + dx;
                if (nny > 0 && nny < size-1 && nnx > 0 && nnx < size-1 && map[nny][nnx] === 1) {
                    frontier.push([nny, nnx, ny, nx]);
                }
            }
        }
    }
    
    // Adiciona paredes extras baseado na densidade (para tornar mais labiríntico)
    const targetWalls = Math.floor(size * size * wallDensity);
    let currentWalls = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (map[row][col] === 1) currentWalls++;
        }
    }
    
    // Se precisamos de MAIS paredes, adiciona aleatoriamente
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
    
    // Garante bordas sólidas
    for (let i = 0; i < size; i++) {
        map[0][i] = 1;
        map[size-1][i] = 1;
        map[i][0] = 1;
        map[i][size-1] = 1;
    }
    
    // Garante que o centro está livre
    map[startY][startX] = 0;
    
    return map;
}

ensureConnectivity(map, size) {
    // Este método agora é mais simples porque o algoritmo de Prim já garante conectividade
    // Apenas verifica se o centro está acessível
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
    
    // Abre células isoladas
    for (let row = 1; row < size-1; row++) {
        for (let col = 1; col < size-1; col++) {
            if (map[row][col] === 0 && !visited[row][col]) {
                // Conecta ao vizinho visitado mais próximo
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
    // Determina quais texturas usar baseado no tema
    // Se o tema não especificar, usa os defaults
    const wallType = theme.wallType || 'rough_block_wall';
    const floorType = theme.floorType || 'mossy_rock';
    
    let wallMaterial, floorMaterial;
    
    try {
        // ===== CARREGA TEXTURAS DA PAREDE =====
        const wallDiffuse = this.textureLoader.load(`/assets/textures/wall/${wallType}_diff_2k.jpg`);
        const wallRoughness = this.textureLoader.load(`/assets/textures/wall/${wallType}_rough_2k.jpg`);
        const wallNormal = this.textureLoader.load(`/assets/textures/wall/${wallType}_nor_gl_2k.jpg`);
        
        // ===== CARREGA TEXTURAS DO CHÃO =====
        const floorDiffuse = this.textureLoader.load(`/assets/textures/floor/${floorType}_diff_2k.jpg`);
        const floorRoughness = this.textureLoader.load(`/assets/textures/floor/${floorType}_rough_2k.jpg`);
        const floorNormal = this.textureLoader.load(`/assets/textures/floor/${floorType}_nor_gl_2k.jpg`);
        
        // ===== CONFIGURA WRAPPING PARA PAREDES =====
        [wallDiffuse, wallRoughness, wallNormal].forEach(tex => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(2, 1); // Repete 2x na horizontal, 1x na vertical
        });
        
        // ===== CONFIGURA WRAPPING PARA CHÃO =====
        [floorDiffuse, floorRoughness, floorNormal].forEach(tex => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(3, 3); // Repete 3x em cada direção para detalhe
        });
        
        // ===== CRIA MATERIAIS COM TEXTURAS REAIS =====
        wallMaterial = new THREE.MeshStandardMaterial({
            map: wallDiffuse,
            roughnessMap: wallRoughness,
            normalMap: wallNormal,
            roughness: 0.8,
            metalness: 0.1,
            color: theme.wallColor // Multiplica com a cor do tema para ajuste fino
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
        
        // ===== FALLBACK: TEXTURAS PROCEDURAIS =====
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
    
    getStartPosition() {
        return this.startPosition;
    }
    
    getWalls() {
        return this.walls;
    }
    
    getCrystals() {
        return this.crystals;
    }
    
    getPortal() {
        return this.portal;
    }
}