import * as THREE from 'three';
import { GAME_CONFIG } from '../utils/constants.js';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.position = new THREE.Vector3(0, GAME_CONFIG.PLAYER_HEIGHT, 0);
        this.velocity = new THREE.Vector3();
        this.speed = GAME_CONFIG.PLAYER_SPEED;
        
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.pitchSpeed = 0.002;
        this.yawSpeed = 0.002;
        this.maxPitch = Math.PI / 2.2;
        
        this.energy = 1.0;
        this.drainRate = GAME_CONFIG.BASE_ENERGY_DRAIN;
        
        // ⭐ NOVAS PROPRIEDADES PARA A INTENSIDADE PROGRESSIVA
        this.baseIntensity = GAME_CONFIG.FLASHLIGHT_BASE_INTENSITY;
        this.intensityMultiplier = 1.0;
        
        // Lanterna (adicionada à cena)
        this.flashlight = new THREE.SpotLight(0xffeedd, this.baseIntensity);
        this.flashlight.angle = Math.PI / 5;
        this.flashlight.penumbra = 0.5;
        this.flashlight.decay = 1;
        this.flashlight.distance = GAME_CONFIG.FLASHLIGHT_BASE_DISTANCE;
        this.flashlight.castShadow = true;
        this.scene.add(this.flashlight);
        
        // Alvo da luz
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
        // 1. Drenagem de energia e cálculo da intensidade base
        if (this.energy > 0) {
            this.energy = Math.max(0, this.energy - this.drainRate * deltaTime);
            let intensity = 0.5 + (this.baseIntensity - 0.5) * this.energy;
            
            // ⭐ APLICA O MULTIPLICADOR (cada cristal aumenta)
            intensity *= this.intensityMultiplier;
            
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
        const offset = new THREE.Vector3(0.4, -0.3, -0.4);
        const lightPos = this.position.clone().add(offset.clone().applyQuaternion(this.camera.quaternion));
        this.flashlight.position.copy(lightPos);
        
        const targetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const targetPos = this.position.clone().add(targetDir.multiplyScalar(15));
        this.flightlightTarget.position.copy(targetPos);
    }
    
    // ⭐ MÉTODO RECHARGE MODIFICADO: aceita "isCrystal" para aumentar multiplicador
    recharge(amount, isCrystal = false) {
        this.energy = Math.min(1.0, this.energy + amount);
        if (isCrystal) {
            this.intensityMultiplier += 0.1;        // +10% por cristal
            this.intensityMultiplier = Math.min(3.0, this.intensityMultiplier); // máximo 3x
            console.log(`💪 Intensidade da lanterna: ${(this.intensityMultiplier * 100).toFixed(0)}%`);
        }
    }
}