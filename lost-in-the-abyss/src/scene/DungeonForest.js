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
        this.textureLoader = new THREE.TextureLoader();
        
        this.walls = [];
        this.crystals = [];
        this.portal = null;
        
        // Caminhos de debug
        this.pathGroup = new THREE.Group();
        this.scene.add(this.pathGroup);
        this.greenPathGroup = new THREE.Group();
        this.scene.add(this.greenPathGroup);
        this.showGreenPath = true;
        
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        
        // Sistema de partículas (folhas a cair)
        this.leafParticles = null;
    }
    
    generate(levelNumber, theme) {
        // Limpeza
        while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
        this.walls = [];
        this.crystals = [];
        while (this.pathGroup.children.length > 0) this.pathGroup.remove(this.pathGroup.children[0]);
        while (this.greenPathGroup.children.length > 0) this.greenPathGroup.remove(this.greenPathGroup.children[0]);
        
        const size = theme.mapSize;
        const map = this.generateForestMaze(size, theme.wallDensity);
        this.ensureConnectivity(map, size);
        
        const { floorMaterial, wallMaterial } = this.createForestMaterials(theme);
        const offsetX = (size * this.tileSize) / 2;
        const offsetZ = (size * this.tileSize) / 2;
        
        let farthestPos = null;
        let farthestDist = 0;
        
        // ===== CHÃO E PAREDES (LABIRINTO) =====
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                // Chão com textura de floresta
                const floorGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                const floor = new THREE.Mesh(floorGeo, floorMaterial.clone());
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x, 0, z);
                floor.receiveShadow = true;
                this.group.add(floor);
                
                if (map[row][col] === 1) {
                    // Parede com textura de casca de árvore
                    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
                    const wall = new THREE.Mesh(wallGeo, wallMaterial.clone());
                    wall.position.set(x, this.wallHeight / 2, z);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.group.add(wall);
                    this.walls.push(wall);
                    
                    // Adiciona musgo/cogumelos nas paredes (detalhe)
                    this.addWallDetails(wall, x, z);
                } else if (map[row][col] === 0) {
                    const dist = Math.sqrt(x * x + z * z);
                    if (dist > farthestDist) {
                        farthestDist = dist;
                        farthestPos = new THREE.Vector3(x, 1.0, z);
                    }
                }
            }
        }
        
        this.createSky(theme);
        
        this.setupOutdoorLighting(theme);
        
        this.addDecorativeTrees(theme, size, offsetX, offsetZ);
        
        this.createLeafParticles(theme);
        
        this.placeCrystals(theme, size, offsetX, offsetZ, map);
        
        this.placePortal(theme, farthestPos, map, size, offsetX, offsetZ);
        
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        
        console.log(`Floresta gerada: ${size}x${size}, ${this.walls.length} paredes, ${this.crystals.length} cristais`);
    }
    
    createForestMaterials(theme) {
        // Material do chão (floresta)
        let floorMaterial;
        try {
            const floorDiffuse = this.textureLoader.load('/assets/textures/floor/forrest_ground_01_diff_4k.jpg');
            const floorRoughness = this.textureLoader.load('/assets/textures/floor/forrest_ground_01_rough_4k.jpg');
            const floorNormal = this.textureLoader.load('/assets/textures/floor/forrest_ground_01_nor_gl_4k.jpg');
            
            [floorDiffuse, floorRoughness, floorNormal].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(4, 4);
            });
            
            floorMaterial = new THREE.MeshStandardMaterial({
                map: floorDiffuse,
                roughnessMap: floorRoughness,
                normalMap: floorNormal,
                roughness: 0.9,
                metalness: 0.05,
                color: theme.floorColor
            });
            console.log('Textura de floresta carregada');
        } catch(e) {
            console.warn('Fallback: cor sólida para chão');
            floorMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.9 });
        }
        
        // Material das paredes (casca de árvore)
        let wallMaterial;
        try {
            const wallDiffuse = this.textureLoader.load('/assets/textures/wall/bark_willow_02_diff_4k.jpg');
            const wallRoughness = this.textureLoader.load('/assets/textures/wall/bark_willow_02_rough_4k.jpg');
            const wallNormal = this.textureLoader.load('/assets/textures/wall/bark_willow_02_nor_gl_4k.jpg');
            
            [wallDiffuse, wallRoughness, wallNormal].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(2, 2);
            });
            
            wallMaterial = new THREE.MeshStandardMaterial({
                map: wallDiffuse,
                roughnessMap: wallRoughness,
                normalMap: wallNormal,
                roughness: 0.7,
                metalness: 0.1,
                color: theme.wallColor
            });
            console.log('Textura de casca carregada');
        } catch(e) {
            console.warn('Fallback: cor sólida para paredes');
            wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7 });
        }
        
        return { floorMaterial, wallMaterial };
    }
    
    addWallDetails(wall, x, z) {
        // Adiciona pequenos cogumelos ou musgo nas paredes (detalhe decorativo)
        if (Math.random() > 0.85) {
            const mossMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.8 });
            const moss = new THREE.Mesh(new THREE.SphereGeometry(0.15, 3, 3), mossMat);
            moss.position.set(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 3,
                (Math.random() - 0.5) * 1.5
            );
            moss.castShadow = true;
            wall.add(moss);
        }
    }
    
    createSky(theme) {
        this.scene.background = new THREE.Color(0x1a2a3a);
        
        this.scene.fog = new THREE.FogExp2(0x3a5a4a, theme.fogDensity * 0.8);
        
        const cloudCount = 50;
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0x444444 });
        for (let i = 0; i < cloudCount; i++) {
            const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.8, 5, 5), cloudMat);
            cloud.position.set(
                (Math.random() - 0.5) * 80,
                15 + Math.random() * 10,
                (Math.random() - 0.5) * 80
            );
            cloud.scale.set(2 + Math.random(), 0.5 + Math.random() * 0.5, 1 + Math.random());
            this.group.add(cloud);
        }
    }
    
    setupOutdoorLighting(theme) {
        const ambientLight = new THREE.AmbientLight(0x5a7a5a, 0.5);
        this.group.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffdd99, 1.2);
        sunLight.position.set(15, 20, 5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        sunLight.shadow.camera.left = -15;
        sunLight.shadow.camera.right = 15;
        sunLight.shadow.camera.top = 15;
        sunLight.shadow.camera.bottom = -15;
        this.group.add(sunLight);
        
        // Luz de preenchimento (backlight)
        const backLight = new THREE.PointLight(0x88aaff, 0.3);
        backLight.position.set(-5, 8, -10);
        this.group.add(backLight);
        
        const fireflyCount = 30;
        this.fireflies = [];
        for (let i = 0; i < fireflyCount; i++) {
            const firefly = new THREE.PointLight(0xaaff66, 0.4, 8);
            firefly.position.set(
                (Math.random() - 0.5) * 40,
                1 + Math.random() * 3,
                (Math.random() - 0.5) * 40
            );
            this.group.add(firefly);
            this.fireflies.push(firefly);
        }
    }
    
    addDecorativeTrees(theme, size, offsetX, offsetZ) {
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7 });
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.4 });
        
        const treeCount = 40;
        for (let i = 0; i < treeCount; i++) {
            // Posiciona árvores nas bordas
            const side = Math.floor(Math.random() * 4);
            let x, z;
            const margin = (size / 2) * this.tileSize;
            
            switch(side) {
                case 0: x = -margin - 2; z = (Math.random() - 0.5) * size * this.tileSize; break;
                case 1: x = margin + 2; z = (Math.random() - 0.5) * size * this.tileSize; break;
                case 2: z = -margin - 2; x = (Math.random() - 0.5) * size * this.tileSize; break;
                default: z = margin + 2; x = (Math.random() - 0.5) * size * this.tileSize; break;
            }
            
            const treeGroup = new THREE.Group();
            
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.8, 6), treeMat);
            trunk.position.y = 0.9;
            trunk.castShadow = true;
            treeGroup.add(trunk);
            
            for (let j = 0; j < 3; j++) {
                const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.8 - j*0.15, 0.9, 8), foliageMat);
                foliage.position.y = 1.5 + j * 0.7;
                foliage.castShadow = true;
                treeGroup.add(foliage);
            }
            
            treeGroup.position.set(x, 0, z);
            this.group.add(treeGroup);
        }
    }
    
    createLeafParticles(theme) {
        const leafCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(leafCount * 3);
        
        for (let i = 0; i < leafCount; i++) {
            positions[i*3] = (Math.random() - 0.5) * 50;
            positions[i*3+1] = Math.random() * 12;
            positions[i*3+2] = (Math.random() - 0.5) * 50;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const leafMat = new THREE.PointsMaterial({
            color: 0x6a9a4a,
            size: 0.08,
            transparent: true,
            opacity: 0.6
        });
        
        this.leafParticles = new THREE.Points(geometry, leafMat);
        this.group.add(this.leafParticles);
    }
    
    generateForestMaze(size, wallDensity) {
        // Mesmo algoritmo da masmorra, mas com densidade ajustada
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
        
        // Adiciona paredes extras para densidade
        const targetWalls = Math.floor(size*size*wallDensity);
        let currentWalls = 0;
        for (let row=0; row<size; row++) for (let col=0; col<size; col++) if (map[row][col]===1) currentWalls++;
        
        if (currentWalls < targetWalls) {
            const cells = [];
            for (let row=1; row<size-1; row++) for (let col=1; col<size-1; col++) if (map[row][col]===0) cells.push([row,col]);
            cells.sort(()=>Math.random()-0.5);
            const toAdd = Math.min(targetWalls-currentWalls, cells.length);
            for (let i=0; i<toAdd; i++) { const [r,c]=cells[i]; map[r][c]=1; }
        }
        
        // Bordas sólidas
        for (let i=0; i<size; i++) { map[0][i]=1; map[size-1][i]=1; map[i][0]=1; map[i][size-1]=1; }
        map[startY][startX]=0;
        
        return map;
    }
    
    ensureConnectivity(map, size) {
        // Mesmo método da Dungeon original
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
    
    placeCrystals(theme, size, offsetX, offsetZ, map) {
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
        
        floorCells.sort(() => Math.random() - 0.5);
        const crystalCount = Math.min(theme.totalCrystals, floorCells.length);
        
        // Cores da floresta (verdes, douradas)
        const FOREST_COLORS = [0x88ff88, 0xaaff66, 0x66ffaa, 0xffaa44, 0x88ffaa];
        
        for (let i = 0; i < crystalCount; i++) {
            const pos = floorCells[i];
            let crystalColor = theme.crystalColor;
            if (i < FOREST_COLORS.length) crystalColor = FOREST_COLORS[i % FOREST_COLORS.length];
            
            const crystal = new Crystal(crystalColor, 0.5);
            crystal.mesh.position.copy(pos);
            this.group.add(crystal.mesh);
            this.crystals.push(crystal);
        }
    }
    
    placePortal(theme, farthestPos, map, size, offsetX, offsetZ) {
        if (farthestPos) {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(farthestPos);
            this.portal.mesh.position.y = 1.6;
            this.group.add(this.portal.mesh);
        } else {
            // Fallback
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.set(0, 1.6, 0);
            this.group.add(this.portal.mesh);
        }
    }
    
    // ===== MÉTODOS PÚBLICOS =====
    getStartPosition() { return this.startPosition; }
    getWalls() { return this.walls; }
    getCrystals() { return this.crystals; }
    getPortal() { return this.portal; }
    
    updatePath(playerPosition) {
        // Limpa caminho anterior
        while(this.pathGroup.children.length > 0) this.pathGroup.remove(this.pathGroup.children[0]);
        
        const available = this.crystals.filter(c => !c.collected);
        if (available.length === 0) return;
        
        let nearest = null, minDist = Infinity;
        for (const crystal of available) {
            const dist = playerPosition.distanceTo(crystal.mesh.position);
            if (dist < minDist) { minDist = dist; nearest = crystal; }
        }
        
        if (nearest) {
            const start = playerPosition.clone();
            const end = nearest.mesh.position.clone();
            const material = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x442200 });
            
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                const point = start.clone().lerp(end, t);
                point.y = 0.1;
                
                if (i > 0) {
                    const prev = start.clone().lerp(end, (i-1)/20);
                    prev.y = 0.1;
                    const dir = new THREE.Vector3().subVectors(point, prev);
                    const length = dir.length();
                    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, length, 4), material);
                    cylinder.position.copy(prev.clone().add(point).multiplyScalar(0.5));
                    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
                    this.pathGroup.add(cylinder);
                }
            }
        }
        
        // Anima folhas a cair
        if (this.leafParticles) {
            const positions = this.leafParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i*3+1] -= 0.008;
                if (positions[i*3+1] < 0) {
                    positions[i*3+1] = 12;
                    positions[i*3] = (Math.random() - 0.5) * 50;
                    positions[i*3+2] = (Math.random() - 0.5) * 50;
                }
            }
            this.leafParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Anima vaga-lumes
        if (this.fireflies) {
            const time = Date.now() * 0.003;
            this.fireflies.forEach((fly, idx) => {
                const intensity = 0.3 + Math.sin(time * 2 + idx) * 0.2;
                fly.intensity = intensity;
            });
        }
    }
   
    clear() {
    // Remove elementos específicos da floresta
    if (this.leafParticles) {
        if (this.leafParticles.parent) this.leafParticles.parent.remove(this.leafParticles);
        this.leafParticles = null;
    }
    
    if (this.fireflies) {
        this.fireflies.forEach(light => {
            if (light.parent) light.parent.remove(light);
        });
        this.fireflies = [];
    }
    
    // Limpa o grupo principal
    while (this.group.children.length > 0) {
        const child = this.group.children[0];
        this.group.remove(child);
        if (child.isMesh) {
            child.material.dispose();
            child.geometry.dispose();
        }
    }
    
    while (this.pathGroup.children.length > 0) {
        const child = this.pathGroup.children[0];
        this.pathGroup.remove(child);
        if (child.isMesh) {
            child.material.dispose();
            child.geometry.dispose();
        }
    }
    while (this.greenPathGroup.children.length > 0) {
        const child = this.greenPathGroup.children[0];
        this.greenPathGroup.remove(child);
        if (child.isMesh) {
            child.material.dispose();
            child.geometry.dispose();
        }
    }
    
    this.walls = [];
    this.crystals = [];
    this.portal = null;
}
}