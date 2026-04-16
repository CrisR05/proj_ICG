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
        
        this.dustParticles = null;
        this.stars = null;
    }
    
    generate(levelNumber, theme) {
        while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
        this.walls = [];
        this.crystals = [];
        while (this.pathGroup.children.length > 0) this.pathGroup.remove(this.pathGroup.children[0]);
        while (this.greenPathGroup.children.length > 0) this.greenPathGroup.remove(this.greenPathGroup.children[0]);
        
        const size = theme.mapSize;
        const map = this.generateLunarMaze(size, theme.wallDensity);
        this.ensureConnectivity(map, size);
        
        const { floorMaterial, wallMaterial } = this.createLunarMaterials(theme);
        const offsetX = (size * this.tileSize) / 2;
        const offsetZ = (size * this.tileSize) / 2;
        
        let farthestPos = null;
        let farthestDist = 0;
        
        // ===== CHÃO E PAREDES (LABIRINTO LUNAR) =====
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
                    
                    this.addMoonCrystals(wall, x, z);
                } else if (map[row][col] === 0) {
                    const dist = Math.sqrt(x * x + z * z);
                    if (dist > farthestDist) {
                        farthestDist = dist;
                        farthestPos = new THREE.Vector3(x, 1.0, z);
                    }
                }
            }
        }
        
        this.createStarrySky(theme);
        this.setupMoonLighting(theme);
        this.addFloatingRocks(theme, size, offsetX, offsetZ);
        this.createMoonDust(theme);
        this.placeLunarCrystals(theme, size, offsetX, offsetZ, map);
        this.placeLunarPortal(theme, farthestPos);
        this.startPosition = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        console.log(`Lua gerada: ${size}x${size}, ${this.walls.length} paredes, ${this.crystals.length} cristais`);
    }
    
    createLunarMaterials(theme) {
        let floorMaterial;
        try {
            const floorDiffuse = this.textureLoader.load('/assets/textures/floor/moon_footprints_01_diff_4k.jpg');
            const floorRoughness = this.textureLoader.load('/assets/textures/floor/moon_footprints_01_rough_4k.jpg');
            const floorNormal = this.textureLoader.load('/assets/textures/floor/moon_footprints_01_nor_gl_4k.jpg');
            
            [floorDiffuse, floorRoughness, floorNormal].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(3, 3);
            });
            
            floorMaterial = new THREE.MeshStandardMaterial({
                map: floorDiffuse,
                roughnessMap: floorRoughness,
                normalMap: floorNormal,
                roughness: 0.9,
                metalness: 0.3,
                color: 0xccccdd
            });
            console.log('Textura lunar (chão) carregada');
        } catch(e) {
            console.warn('Fallback: cor sólida para chão lunar');
            floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.2 });
        }
        
        let wallMaterial;
        try {
            const wallDiffuse = this.textureLoader.load('/assets/textures/wall/moon_dusted_05_diff_4k.jpg');
            const wallRoughness = this.textureLoader.load('/assets/textures/wall/moon_dusted_05_rough_4k.jpg');
            const wallNormal = this.textureLoader.load('/assets/textures/wall/moon_dusted_05_nor_gl_4k.jpg');
            
            [wallDiffuse, wallRoughness, wallNormal].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(2, 2);
            });
            
            wallMaterial = new THREE.MeshStandardMaterial({
                map: wallDiffuse,
                roughnessMap: wallRoughness,
                normalMap: wallNormal,
                roughness: 0.85,
                metalness: 0.15,
                color: 0xaaaabb
            });
            console.log('Textura lunar (parede) carregada');
        } catch(e) {
            console.warn('Fallback: cor sólida para paredes lunares');
            wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.8, metalness: 0.1 });
        }
        
        return { floorMaterial, wallMaterial };
    }
    
    addMoonCrystals(wall, x, z) {
        if (Math.random() > 0.9) {
            const crystalMat = new THREE.MeshStandardMaterial({ 
                color: 0x88aaff, 
                emissive: 0x224466, 
                emissiveIntensity: 0.5,
                metalness: 0.8
            });
            const crystal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), crystalMat);
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
        // Fundo preto/azul muito escuro
        this.scene.background = new THREE.Color(0x050510);
        
        const starCount = 1500;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            starPositions[i*3] = (Math.random() - 0.5) * 400;
            starPositions[i*3+1] = (Math.random() - 0.5) * 200 + 30;
            starPositions[i*3+2] = (Math.random() - 0.5) * 200 - 100;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 });
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.group.add(this.stars);
        
        const nebulaMat = new THREE.MeshStandardMaterial({ color: 0x442266, emissive: 0x331155, transparent: true, opacity: 0.3 });
        const nebula = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 16), nebulaMat);
        nebula.position.set(-40, 20, -60);
        this.group.add(nebula);
        
        // Lua no céu (grande)
        const moonMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, emissive: 0x886644, emissiveIntensity: 0.3 });
        const bigMoon = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 32), moonMat);
        bigMoon.position.set(35, 25, -80);
        this.group.add(bigMoon);
        
        this.scene.fog = new THREE.FogExp2(0x111122, 0.008);
    }
    
    setupMoonLighting(theme) {
        const ambientLight = new THREE.AmbientLight(0x334455, 0.25);
        this.group.add(ambientLight);
        
        const moonLight = new THREE.DirectionalLight(0xaaccff, 0.8);
        moonLight.position.set(-10, 25, 15);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 1024;
        moonLight.shadow.mapSize.height = 1024;
        this.group.add(moonLight);
        
        const backLight = new THREE.PointLight(0x6688aa, 0.3);
        backLight.position.set(0, 10, -20);
        this.group.add(backLight);
        
        this.pulsingLights = [];
        for (let i = 0; i < 8; i++) {
            const light = new THREE.PointLight(0x88aaff, 0.4, 15);
            light.position.set(
                (Math.random() - 0.5) * 40,
                1 + Math.random() * 4,
                (Math.random() - 0.5) * 40
            );
            this.group.add(light);
            this.pulsingLights.push(light);
        }
    }
    
    addFloatingRocks(theme, size, offsetX, offsetZ) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.7, metalness: 0.2 });
        const rockCount = 30;
        
        for (let i = 0; i < rockCount; i++) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3), rockMat);
            rock.position.set(
                (Math.random() - 0.5) * size * this.tileSize,
                2 + Math.random() * 5,
                (Math.random() - 0.5) * size * this.tileSize
            );
            rock.castShadow = true;
            this.group.add(rock);
            rock.userData = { floatSpeed: 0.5 + Math.random(), floatOffset: Math.random() * Math.PI * 2 };
        }
    }
    
    createMoonDust(theme) {
        const dustCount = 800;
        const dustGeometry = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustColors = new Float32Array(dustCount * 3);
        
        for (let i = 0; i < dustCount; i++) {
            dustPositions[i*3] = (Math.random() - 0.5) * 60;
            dustPositions[i*3+1] = Math.random() * 8;
            dustPositions[i*3+2] = (Math.random() - 0.5) * 60;
            
            const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.5, 0.6);
            dustColors[i*3] = color.r;
            dustColors[i*3+1] = color.g;
            dustColors[i*3+2] = color.b;
        }
        
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
        
        const dustMat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
        this.dustParticles = new THREE.Points(dustGeometry, dustMat);
        this.group.add(this.dustParticles);
    }
    
    generateLunarMaze(size, wallDensity) {
        // Mesmo algoritmo base, mas com densidade menor para dar sensação de crateras
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
        
        // Menos paredes para dar sensação mais aberta
        const targetWalls = Math.floor(size*size * (wallDensity * 0.7));
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
    
    placeLunarCrystals(theme, size, offsetX, offsetZ, map) {
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
        
        // Cores lunares (azuis, roxas, prateadas)
        const MOON_COLORS = [0x88aaff, 0xaa88ff, 0x88ccff, 0xccccff, 0x99aaff];
        
        for (let i = 0; i < crystalCount; i++) {
            const pos = floorCells[i];
            let crystalColor = theme.crystalColor;
            if (i < MOON_COLORS.length) crystalColor = MOON_COLORS[i % MOON_COLORS.length];
            
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
            this.portal.mesh.position.y = 1.6;
            this.group.add(this.portal.mesh);
        } else {
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
            const material = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x224466 });
            
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
        
        if (this.dustParticles) {
            const positions = this.dustParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i*3+1] += 0.002;
                if (positions[i*3+1] > 6) {
                    positions[i*3+1] = 0;
                }
            }
            this.dustParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        if (this.pulsingLights) {
            const time = Date.now() * 0.002;
            this.pulsingLights.forEach((light, idx) => {
                const intensity = 0.3 + Math.sin(time * 1.5 + idx) * 0.2;
                light.intensity = intensity;
            });
        }
        
        if (this.stars) {
            this.stars.rotation.y += 0.0005;
        }
    }
   clear() {
    // Remove luzes adicionadas diretamente à cena
    if (this.pulsingLights) {
        this.pulsingLights.forEach(light => {
            if (light.parent) light.parent.remove(light);
        });
        this.pulsingLights = [];
    }
    
    if (this.stars) {
        if (this.stars.parent) this.stars.parent.remove(this.stars);
        this.stars = null;
    }
    
    if (this.dustParticles) {
        if (this.dustParticles.parent) this.dustParticles.parent.remove(this.dustParticles);
        this.dustParticles = null;
    }
    
    // Limpa o grupo principal
    while (this.group.children.length > 0) {
        const child = this.group.children[0];
        this.group.remove(child);
        // Limpa recursos para evitar memory leaks
        if (child.isMesh) {
            child.material.dispose();
            child.geometry.dispose();
        }
    }
    
    // Limpa grupos de caminho
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
    
    // Limpa arrays
    this.walls = [];
    this.crystals = [];
    this.portal = null;
}
}