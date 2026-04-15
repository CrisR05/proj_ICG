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

// Temas por Nível (com texturas e cores)
export const LEVEL_THEMES = [
    {
        // NÍVEL 1: Masmorra Inicial
        name: 'Forgotten Dungeon',
        wallType: 'rough_block_wall',
        floorType: 'mossy_rock',
        
        // Cores (multiplicam com as texturas)
        wallColor: 0x9a9a9a,              // Cinza médio (mais claro para ver textura)
        floorColor: 0x8b7355,             // Castanho terra
        ambientColor: 0x4a4a5a,           // Azul acinzentado
        fogColor: 0x0a0a14,               // Azul muito escuro
        fogDensity: 0.015,                // Nevoeiro suave
        
        // Iluminação especial
        flashlightColor: 0xffcc99,        // Âmbar quente
        crystalColor: 0x44aaff,           // Azul ciano
        portalColor: 0x44ff88,            // Verde
        
        // Dificuldade
        totalCrystals: 4,
        mapSize: 15,                      // 13x13 (mais rápido para testar)
        wallDensity: 0.45                 // 35% de paredes
    },
    {
        // NÍVEL 2: Abismo Profundo
        name: 'Deep Abyss',
        wallType: 'rough_block_wall',     // Pode mudar para 'obsidian_wall' depois
        floorType: 'mossy_rock',          // Pode mudar para 'dark_floor' depois
        
        wallColor: 0x4a4a5a,              // Cinza escuro azulado
        floorColor: 0x3a3a4a,             // Cinza muito escuro
        ambientColor: 0x2a2a3a,           // Quase preto
        fogColor: 0x050508,               // Preto azulado
        fogDensity: 0.035,                // Nevoeiro mais denso
        
        flashlightColor: 0xaa88ff,        // Roxo místico
        crystalColor: 0xff44aa,           // Rosa
        portalColor: 0x88ff44,            // Verde limão
        
        totalCrystals: 6,
        mapSize: 17,                      // 17x17 (maior)
        wallDensity: 0.45                 // 45% de paredes (mais labiríntico)
    },
    {
        // NÍVEL 3: Cripta Congelada (preparado para futuro)
        name: 'Frozen Crypt',
        wallType: 'rough_block_wall',     // Depois: 'ice_wall'
        floorType: 'mossy_rock',          // Depois: 'snow_floor'
        
        wallColor: 0x7a8a9a,
        floorColor: 0x6a7a8a,
        ambientColor: 0x3a4a5a,
        fogColor: 0x1a2a3a,
        fogDensity: 0.025,
        
        flashlightColor: 0x88ccff,        // Azul gelo
        crystalColor: 0x88ffff,           // Ciano brilhante
        portalColor: 0xaaccff,            // Azul claro
        
        totalCrystals: 5,
        mapSize: 19,
        wallDensity: 0.4
    }
];

// Exporta também cores úteis para debug
export const DEBUG_COLORS = {
    PLAYER: 0xff0000,
    CRYSTAL: 0x00ff00,
    PORTAL: 0x0000ff,
    WALL: 0xffff00
};