import * as THREE from 'three';
import { GAME_CONFIG } from '../utils/constants.js';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.position = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        this.velocity = new THREE.Vector3();
        this.speed = GAME_CONFIG.PLAYER_SPEED;
        
        // Ângulos para rotação com rato
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.pitchSpeed = 0.002;
        this.yawSpeed = 0.002;
        this.maxPitch = Math.PI / 2.2;
        
        // Energia da lanterna
        this.energy = 1.0;
        this.drainRate = GAME_CONFIG.BASE_ENERGY_DRAIN;
        
        // ========== LANTERNA FUNCIONAL (adicionada à cena) ==========
        this.flashlight = new THREE.SpotLight(0xffeedd, GAME_CONFIG.FLASHLIGHT_BASE_INTENSITY);
        this.flashlight.angle = Math.PI / 5;
        this.flashlight.penumbra = 0.5;
        this.flashlight.decay = 1;
        this.flashlight.distance = GAME_CONFIG.FLASHLIGHT_BASE_DISTANCE;
        this.flashlight.castShadow = true;
        
        // Adiciona a luz à cena (NÃO à câmara!)
        this.scene.add(this.flashlight);
        
        // Objecto auxiliar para servir de alvo (também na cena)
        this.flightlightTarget = new THREE.Object3D();
        this.scene.add(this.flightlightTarget);
        this.flashlight.target = this.flightlightTarget;
        
        // Controlos do rato
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.euler.y -= e.movementX * this.yawSpeed;
                this.euler.x -= e.movementY * this.pitchSpeed;
                this.euler.x = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.euler.x));
                this.camera.quaternion.setFromEuler(this.euler);
            }
        });
    }
    
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.camera.position.copy(this.position);
    }
    
    setFlashlightColor(hexColor) {
        this.flashlight.color.setHex(hexColor);
    }
    
    update(deltaTime, keys, collisionCheck) {
        // 1. Drenagem de energia e intensidade da luz
        if (this.energy > 0) {
            this.energy = Math.max(0, this.energy - this.drainRate * deltaTime);
            let intensity = 0.5 + (GAME_CONFIG.FLASHLIGHT_BASE_INTENSITY - 0.5) * this.energy;
            if (this.energy < 0.2) {
                intensity *= 0.8 + 0.4 * Math.sin(Date.now() * 0.02);
            }
            this.flashlight.intensity = intensity;
        } else {
            this.flashlight.intensity = 0;
        }
        
        // 2. Movimento WASD
        const moveSpeed = this.speed * deltaTime;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();
        
        const moveDelta = new THREE.Vector3();
        if (keys['KeyW']) moveDelta.add(forward);
        if (keys['KeyS']) moveDelta.sub(forward);
        if (keys['KeyA']) moveDelta.sub(right);
        if (keys['KeyD']) moveDelta.add(right);
        
        if (moveDelta.length() > 0) {
            moveDelta.normalize();
            moveDelta.multiplyScalar(moveSpeed);
            if (!collisionCheck || !collisionCheck(moveDelta)) {
                this.position.add(moveDelta);
            }
        }
        
        this.camera.position.copy(this.position);
        
        // 3. Actualização da posição da lanterna e do alvo
        // Posição da luz: ligeiramente ao lado e abaixo da câmara (efeito "lanterna na mão")
        const offset = new THREE.Vector3(0.4, -0.3, -0.4);
        const lightPos = this.position.clone().add(offset.clone().applyQuaternion(this.camera.quaternion));
        this.flashlight.position.copy(lightPos);
        
        // Alvo: 15 unidades à frente da câmara, na direcção para onde o jogador olha
        const targetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const targetPos = this.position.clone().add(targetDir.multiplyScalar(15));
        this.flightlightTarget.position.copy(targetPos);
    }
    
    recharge(amount) {
        this.energy = Math.min(1.0, this.energy + amount);
    }
}