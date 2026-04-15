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
        
        // Caminhos de debug
        this.pathGroup = new THREE.Group();
        this.scene.add(this.pathGroup);
        this.greenPathGroup = new THREE.Group();
        this.scene.add(this.greenPathGroup);
        this.showGreenPath = true;
        
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        
        // Sistema de partículas (poeira)
        this.particleSystem = null;
    }
    
    generate(levelNumber, theme) {
        // Limpeza
        while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
        this.walls = [];
        this.crystals = [];
        while (this.pathGroup.children.length > 0) this.pathGroup.remove(this.pathGroup.children[0]);
        while (this.greenPathGroup.children.length > 0) this.greenPathGroup.remove(this.greenPathGroup.children[0]);
        
        const size = theme.mapSize;
        const map = this.generateProceduralMap(size, theme.wallDensity);
        this.ensureConnectivity(map, size);
        
        const { floorMaterial, wallMaterial } = this.createMaterials(theme);
        const offsetX = (size * this.tileSize) / 2;
        const offsetZ = (size * this.tileSize) / 2;
        
        let farthestPos = null;
        let farthestDist = 0;
        
        // Chão e paredes
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * this.tileSize - offsetX + this.tileSize / 2;
                const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                
                const floorGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                const floor = new THREE.Mesh(floorGeo, floorMaterial.clone());
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x, 0, z);
                floor.receiveShadow = true;
                this.group.add(floor);
                
                if (map[row][col] === 1) {
                    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
                    const wall = new THREE.Mesh(wallGeo, wallMaterial.clone());
                    wall.position.set(x, this.wallHeight / 2, z);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.group.add(wall);
                    this.walls.push(wall);
                } else if (map[row][col] === 0) {
                    const dist = Math.sqrt(x * x + z * z);
                    if (dist > farthestDist) {
                        farthestDist = dist;
                        farthestPos = new THREE.Vector3(x, 1.0, z);
                    }
                }
            }
        }
        
        // Tecto
        const ceilingGeo = new THREE.PlaneGeometry(size * this.tileSize, size * this.tileSize);
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, emissive: 0x050505, side: THREE.DoubleSide });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, this.wallHeight, 0);
        this.group.add(ceiling);
        
        // Luz de preenchimento
        const fillLight = new THREE.PointLight(0x446688, 0.15, size * this.tileSize * 2);
        fillLight.position.set(0, this.wallHeight / 2, 0);
        this.group.add(fillLight);
        
        // ===== CRISTAIS =====
        const floorCells = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (map[row][col] === 0) {
                    const x = col * this.tileSize - offsetX + this.tileSize / 2;
                    const z = row * this.tileSize - offsetZ + this.tileSize / 2;
                    const distFromCenter = Math.sqrt(x * x + z * z);
                    if (distFromCenter > 5) {
                        floorCells.push({ pos: new THREE.Vector3(x, 1.0, z), row, col });
                    }
                }
            }
        }
        floorCells.sort(() => Math.random() - 0.5);
        
        const MIN_CRYSTAL_DISTANCE = 6.0;
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
        if (selectedPositions.length < theme.totalCrystals) {
            for (let cell of floorCells) {
                if (!selectedPositions.some(p => p.equals(cell.pos))) {
                    selectedPositions.push(cell.pos);
                    if (selectedPositions.length >= theme.totalCrystals) break;
                }
            }
        }
        
        // Paleta de cores para nível 1
        const CRYSTAL_COLORS = [0x44aaff, 0xff44aa, 0xaaff44, 0xffaa44, 0xaa44ff];
        for (let i = 0; i < selectedPositions.length; i++) {
            const pos = selectedPositions[i];
            let crystalColor = theme.crystalColor;
            if (levelNumber === 1) {
                crystalColor = CRYSTAL_COLORS[i % CRYSTAL_COLORS.length];
            }
            const crystal = new Crystal(crystalColor, 0.45); // tamanho reduzido
            crystal.mesh.position.copy(pos);
            this.group.add(crystal.mesh);
            this.crystals.push(crystal);
        }
        console.log(`✨ Cristais colocados: ${this.crystals.length}`);
        
        // ===== PORTAL =====
        const wallAdjacentCells = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (map[row][col] === 0) {
                    let hasWall = false;
                    const neighbors = [[row-1, col], [row+1, col], [row, col-1], [row, col+1]];
                    for (let [nr, nc] of neighbors) {
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && map[nr][nc] === 1) {
                            hasWall = true;
                            break;
                        }
                    }
                    if (hasWall) {
                        const x = col * this.tileSize - offsetX + this.tileSize/2;
                        const z = row * this.tileSize - offsetZ + this.tileSize/2;
                        wallAdjacentCells.push({ row, col, x, z });
                    }
                }
            }
        }
        
        const getPortalRotation = (map, row, col) => {
            if (row > 0 && map[row-1][col] === 1) return 0;
            if (row < size-1 && map[row+1][col] === 1) return Math.PI;
            if (col > 0 && map[row][col-1] === 1) return -Math.PI/2;
            if (col < size-1 && map[row][col+1] === 1) return Math.PI/2;
            return 0;
        };
        
        let bestPortalCell = null;
        let bestDistance = -1;
        for (let cell of wallAdjacentCells) {
            const dist = Math.sqrt(cell.x*cell.x + cell.z*cell.z);
            if (dist > bestDistance) {
                bestDistance = dist;
                bestPortalCell = cell;
            }
        }
        
        if (bestPortalCell) {
            this.portal = new Portal(theme.portalColor);
            // ⭐ ALTURA CORRIGIDA: 1.6 (metade da altura 3.2) para a base tocar o chão
            this.portal.mesh.position.set(bestPortalCell.x, 1.6, bestPortalCell.z);
            const angle = getPortalRotation(map, bestPortalCell.row, bestPortalCell.col);
            this.portal.setOrientation(angle);
            this.group.add(this.portal.mesh);
            console.log(`🚪 Portal colocado com rotação ${angle}`);
        } else if (farthestPos) {
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(farthestPos);
            this.portal.mesh.position.y = 1.6; // ⭐ CORRIGIDO
            this.group.add(this.portal.mesh);
        } else if (floorCells.length > 0) {
            const fallbackPos = floorCells[floorCells.length-1].pos;
            this.portal = new Portal(theme.portalColor);
            this.portal.mesh.position.copy(fallbackPos);
            this.portal.mesh.position.y = 1.6; // ⭐ CORRIGIDO
            this.group.add(this.portal.mesh);
        }
        
        // ===== PARTÍCULAS DE POEIRA (AMBIENTE) =====
        const particleCount = 400;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const rangeX = size * this.tileSize;
            const rangeZ = size * this.tileSize;
            positions[i*3] = (Math.random() - 0.5) * rangeX;
            positions[i*3+1] = Math.random() * this.wallHeight * 0.8;
            positions[i*3+2] = (Math.random() - 0.5) * rangeZ;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: theme.flashlightColor,
            size: 0.06,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.group.add(this.particleSystem);
        this.particleSystem.userData = { rotationSpeed: 0.001 };
        
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        console.log(`🗺️ Dungeon gerada: ${size}x${size}, ${this.walls.length} paredes, ${this.crystals.length} cristais`);
    }
    
    // Caminho para o portal (linha verde)
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
    
    updateGreenPath(playerPosition) {
        if (!this.showGreenPath) return;
        while(this.greenPathGroup.children.length) this.greenPathGroup.remove(this.greenPathGroup.children[0]);
        const path = this.calculatePathToPortal(playerPosition);
        if (!path || path.length < 2) return;
        const material = new THREE.MeshStandardMaterial({ color: 0x33ff33, emissive: 0x116611 });
        for (let i = 0; i < path.length-1; i++) {
            const p1 = path[i], p2 = path[i+1];
            const dir = new THREE.Vector3().subVectors(p2, p1);
            const length = dir.length();
            const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, length, 4), material);
            cylinder.position.copy(p1.clone().add(p2).multiplyScalar(0.5));
            cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
            this.greenPathGroup.add(cylinder);
        }
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.4,8,8), new THREE.MeshStandardMaterial({ color: 0x33ff33, emissive: 0x33ff33 }));
        marker.position.copy(this.portal.mesh.position);
        marker.position.y = 0.5;
        this.greenPathGroup.add(marker);
    }
    
    calculatePathToNearestCrystal(currentPosition) {
        const available = this.crystals.filter(c => !c.collected);
        if (available.length === 0) return null;
        let nearest = null, minDist = Infinity;
        for (const crystal of available) {
            const dist = currentPosition.distanceTo(crystal.mesh.position);
            if (dist < minDist) { minDist = dist; nearest = crystal; }
        }
        if (!nearest) return null;
        const start = currentPosition.clone();
        const end = nearest.mesh.position.clone();
        const path = [start];
        for (let i = 1; i <= 20; i++) {
            const t = i / 20;
            const point = start.clone().lerp(end, t);
            point.y = 0.1;
            path.push(point);
        }
        return path;
    }
    
    updatePath(playerPosition) {
        // Caminho vermelho
        while(this.pathGroup.children.length) this.pathGroup.remove(this.pathGroup.children[0]);
        const path = this.calculatePathToNearestCrystal(playerPosition);
        if (path && path.length >= 2) {
            const material = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x441111 });
            for (let i = 0; i < path.length-1; i++) {
                const p1 = path[i], p2 = path[i+1];
                const dir = new THREE.Vector3().subVectors(p2, p1);
                const length = dir.length();
                const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, length, 4), material);
                cylinder.position.copy(p1.clone().add(p2).multiplyScalar(0.5));
                cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
                this.pathGroup.add(cylinder);
            }
            const nearestCrystal = this.crystals.find(c => !c.collected);
            if (nearestCrystal) {
                const marker = new THREE.Mesh(new THREE.SphereGeometry(0.35,8,8), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff2200 }));
                marker.position.copy(nearestCrystal.mesh.position);
                marker.position.y = 0.5;
                this.pathGroup.add(marker);
            }
        }
        this.updateGreenPath(playerPosition);
        
        // Animação das partículas (rotação lenta)
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.002;
        }
    }
    
    generateProceduralMap(size, wallDensity) {
        const map = Array(size).fill().map(() => Array(size).fill(1));
        const startX = Math.floor(size/2);
        const startY = Math.floor(size/2);
        map[startY][startX] = 0;
        let frontier = [];
        const dirs = [[0,2],[0,-2],[2,0],[-2,0]];
        for (let [dy,dx] of dirs) {
            const ny = startY+dy, nx = startX+dx;
            if (ny>0 && ny<size-1 && nx>0 && nx<size-1) frontier.push([ny,nx,startY,startX]);
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
            [wallDiffuse, wallRoughness, wallNormal].forEach(tex => { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2,1); });
            [floorDiffuse, floorRoughness, floorNormal].forEach(tex => { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3,3); });
            wallMaterial = new THREE.MeshStandardMaterial({ map: wallDiffuse, roughnessMap: wallRoughness, normalMap: wallNormal, roughness: 0.8, metalness: 0.1, color: theme.wallColor });
            floorMaterial = new THREE.MeshStandardMaterial({ map: floorDiffuse, roughnessMap: floorRoughness, normalMap: floorNormal, roughness: 0.9, metalness: 0.05, color: theme.floorColor });
        } catch(e) {
            console.warn("Fallback procedural");
            const wallTexture = generateStoneTexture(theme.wallColor);
            const floorTexture = generateStoneTexture(theme.floorColor);
            const wallNormalMap = generateNormalMap();
            const floorNormalMap = generateNormalMap();
            [wallTexture, floorTexture, wallNormalMap, floorNormalMap].forEach(tex => { if(tex) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; } });
            wallTexture.repeat.set(2,1); floorTexture.repeat.set(3,3);
            if(wallNormalMap) wallNormalMap.repeat.set(2,1);
            if(floorNormalMap) floorNormalMap.repeat.set(3,3);
            wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, normalMap: wallNormalMap, color: theme.wallColor, roughness: 0.8, metalness: 0.1 });
            floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, normalMap: floorNormalMap, color: theme.floorColor, roughness: 0.9, metalness: 0.05 });
        }
        return { floorMaterial, wallMaterial };
    }
    
    getStartPosition() { return this.startPosition; }
    getWalls() { return this.walls; }
    getCrystals() { return this.crystals; }
    getPortal() { return this.portal; }
}