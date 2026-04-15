import * as THREE from 'three';

// Configurações do Jogo
export const GAME_CONFIG = {
    STATES: {
        MENU: 'menu',
        PLAYING: 'playing',
        GAME_OVER: 'gameOver',
        LEVEL_COMPLETE: 'levelComplete',
        VICTORY: 'victory'
    },
    
    // Energia e Lanterna
    BASE_ENERGY_DRAIN: 0.015,           // Por segundo
    FLASHLIGHT_BASE_DISTANCE: 25,        // Alcance máximo
    FLASHLIGHT_BASE_INTENSITY: 3.5,      // Brilho máximo
    
    // Dimensões do Mundo
    TILE_SIZE: 4.0,                      // Tamanho de cada célula
    WALL_HEIGHT: 5.0,                    // Altura das paredes
    PLAYER_HEIGHT: 1.8,                  // Altura dos olhos do jogador
    PLAYER_SPEED: 5.0,                   // Velocidade de movimento
    
    // Distâncias de Interação
    CRYSTAL_COLLECT_DISTANCE: 2.5,       // Distância para coletar cristal
    PORTAL_ACTIVATE_DISTANCE: 3.0,       // Distância para ativar portal
    
    // Debug
    DEBUG: true                          // Mostra logs no console
};

// Temas fixos (exemplo para 3 níveis) – podes manter para compatibilidade
export const LEVEL_THEMES = [
    {
        name: 'Forgotten Dungeon',
        wallType: 'rough_block_wall',
        floorType: 'mossy_rock',
        wallColor: 0x9a9a9a,
        floorColor: 0x8b7355,
        ambientColor: 0x4a4a5a,
        fogColor: 0x0a0a14,
        fogDensity: 0.015,
        flashlightColor: 0xffcc99,
        crystalColor: 0x44aaff,
        portalColor: 0x44ff88,
        totalCrystals: 4,
        mapSize: 15,
        wallDensity: 0.45
    },
    {
        name: 'Deep Abyss',
        wallType: 'rough_block_wall',
        floorType: 'mossy_rock',
        wallColor: 0x4a4a5a,
        floorColor: 0x3a3a4a,
        ambientColor: 0x2a2a3a,
        fogColor: 0x050508,
        fogDensity: 0.035,
        flashlightColor: 0xaa88ff,
        crystalColor: 0xff44aa,
        portalColor: 0x88ff44,
        totalCrystals: 6,
        mapSize: 17,
        wallDensity: 0.45
    },
    {
        name: 'Frozen Crypt',
        wallType: 'rough_block_wall',
        floorType: 'mossy_rock',
        wallColor: 0x7a8a9a,
        floorColor: 0x6a7a8a,
        ambientColor: 0x3a4a5a,
        fogColor: 0x1a2a3a,
        fogDensity: 0.025,
        flashlightColor: 0x88ccff,
        crystalColor: 0x88ffff,
        portalColor: 0xaaccff,
        totalCrystals: 5,
        mapSize: 19,
        wallDensity: 0.4
    }
];

// Cores para debug
export const DEBUG_COLORS = {
    PLAYER: 0xff0000,
    CRYSTAL: 0x00ff00,
    PORTAL: 0x0000ff,
    WALL: 0xffff00
};

// ===================== GERAÇÃO DINÂMICA DE NÍVEIS =====================
// Gera temas para N níveis (até maxLevels = 20)
export function generateThemes(numLevels) {
    const themes = [];
    const maxLevels = Math.min(numLevels, 20);
    
    // Nomes base (para variedade)
    const baseNames = [
        'Abyss', 'Crypt', 'Catacomb', 'Nether', 'Shadow', 
        'Void', 'Desolation', 'Torment', 'Oblivion', 'Forsaken',
        'Dread', 'Murmur', 'Silence', 'Echo', 'Grave',
        'Hollow', 'Frost', 'Ember', 'Twilight', 'Nightmare'
    ];
    
    // Tipos de textura disponíveis (podes expandir)
    const wallTypes = ['rough_block_wall', 'rough_block_wall', 'rough_block_wall', 'rough_block_wall'];
    const floorTypes = ['mossy_rock', 'mossy_rock', 'mossy_rock', 'mossy_rock'];
    
    for (let i = 0; i < maxLevels; i++) {
        const t = i / (maxLevels - 1 || 1); // 0..1 (dificuldade relativa)
        
        // Progressão de dificuldade
        const totalCrystals = Math.floor(3 + t * 12);      // 3 a 15
        const mapSize = Math.floor(13 + t * 12);           // 13 a 25
        const wallDensity = 0.35 + t * 0.25;              // 0.35 a 0.60
        const fogDensity = 0.012 + t * 0.04;              // 0.012 a 0.052
        const drainRate = GAME_CONFIG.BASE_ENERGY_DRAIN + t * 0.01; // extra drenagem (opcional)
        
        // Cores: matiz começa laranja (30°) e vai até roxo (280°)
        const hueStart = 30;
        const hueEnd = 280;
        const hue = hueStart + (hueEnd - hueStart) * t;
        
        const wallColor = new THREE.Color().setHSL(hue / 360, 0.6, 0.3).getHex();
        const floorColor = new THREE.Color().setHSL(hue / 360, 0.5, 0.2).getHex();
        const ambientColor = new THREE.Color().setHSL(hue / 360, 0.4, 0.1).getHex();
        const fogColor = new THREE.Color().setHSL(hue / 360, 0.5, 0.05).getHex();
        // Cor da lanterna: complementar (hue+180)
        const flashlightColor = new THREE.Color().setHSL(((hue + 180) % 360) / 360, 0.8, 0.6).getHex();
        // Cristal: cor vibrante (hue+120)
        const crystalColor = new THREE.Color().setHSL(((hue + 120) % 360) / 360, 0.9, 0.55).getHex();
        // Portal: cor complementar suave
        const portalColor = new THREE.Color().setHSL(((hue + 60) % 360) / 360, 0.8, 0.5).getHex();
        
        themes.push({
            name: `${baseNames[i % baseNames.length]} ${Math.floor(i / baseNames.length) + 1}`,
            wallType: wallTypes[i % wallTypes.length],
            floorType: floorTypes[i % floorTypes.length],
            wallColor: wallColor,
            floorColor: floorColor,
            ambientColor: ambientColor,
            fogColor: fogColor,
            fogDensity: fogDensity,
            flashlightColor: flashlightColor,
            crystalColor: crystalColor,
            portalColor: portalColor,
            totalCrystals: totalCrystals,
            mapSize: mapSize,
            wallDensity: wallDensity,
            // Extra: energia drena mais rápido em níveis altos (opcional, podes usar ou não)
            energyDrainMultiplier: 1 + t * 0.5   // até 1.5x no nível máximo
        });
    }
    
    return themes;
}