import * as THREE from 'three';
import { GAME_CONFIG } from '../utils/constants.js';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, GAME_CONFIG.PLAYER_HEIGHT, 5);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        this.ambientLight = new THREE.AmbientLight(0x404060, 0.2);
        this.scene.add(this.ambientLight);
        
        this.currentFog = null;
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    applyTheme(theme) {
        if (this.currentFog) {
            this.scene.fog = null;
        }
        
        this.scene.background = new THREE.Color(theme.fogColor);
        
        this.currentFog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
        this.scene.fog = this.currentFog;
        
        this.ambientLight.color.setHex(theme.ambientColor);
        this.ambientLight.intensity = 0.2;
    }
    
    resetScene() {
        if (this.scene.fog) {
            this.scene.fog = null;
            this.currentFog = null;
        }
        
        this.scene.background = new THREE.Color(0x000000);
        
        const lightsToRemove = [];
        this.scene.children.forEach(child => {
            if (child.isLight && child !== this.ambientLight) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach(light => {
            this.scene.remove(light);
        });
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