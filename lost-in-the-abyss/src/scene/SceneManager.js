import * as THREE from 'three';
import { GAME_CONFIG } from '../utils/constants.js';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        
        // Câmara Perspetiva
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, GAME_CONFIG.PLAYER_HEIGHT, 5);
        
        // Renderizador com sombras
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Luz Ambiente base (será ajustada por tema)
this.ambientLight = new THREE.AmbientLight(0x404060, 0.2);        this.scene.add(this.ambientLight);
        
        // Evento de redimensionamento
        window.addEventListener('resize', () => this.onResize());
    }
    
    applyTheme(theme) {
    this.scene.background = new THREE.Color(theme.fogColor);
    // Nevoeiro que muda com o tempo (ligeira pulsação)
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
    // Opcional: adicionar um segundo plano de nevoeiro com animação
}
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}