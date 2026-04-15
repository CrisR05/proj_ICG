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
        
        // ========== HEAD BOB (apenas vertical) ==========
        this.bobEnabled = true;
        this.bobSpeed = 10.0;      // velocidade do ciclo
        this.bobAmount = 0.04;      // amplitude vertical (metros)
        this.bobTimer = 0;
        this.isMoving = false;
        this.defaultHeight = GAME_CONFIG.PLAYER_HEIGHT; // 1.8
        
        // ========== LANTERNA ==========
        this.baseIntensity = GAME_CONFIG.FLASHLIGHT_BASE_INTENSITY;
        this.intensityMultiplier = 1.0;
        
        this.flashlight = new THREE.SpotLight(0xffeedd, this.baseIntensity);
        this.flashlight.angle = Math.PI / 5;
        this.flashlight.penumbra = 0.5;
        this.flashlight.decay = 1;
        this.flashlight.distance = GAME_CONFIG.FLASHLIGHT_BASE_DISTANCE;
        this.flashlight.castShadow = true;
        this.scene.add(this.flashlight);
        
        this.flightlightTarget = new THREE.Object3D();
        this.scene.add(this.flightlightTarget);
        this.flashlight.target = this.flightlightTarget;
        
        // Offset da lanterna (posição relativa à câmara)
        this.flashlightOffset = new THREE.Vector3(0.4, -0.3, -0.4);
        
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
        this.updateCameraPosition(0);
    }
    
    setFlashlightColor(hexColor) {
        this.flashlight.color.setHex(hexColor);
    }
    
    // Função auxiliar para actualizar a posição da câmara com head bob
    updateCameraPosition(bobOffsetY) {
        // A câmara segue a posição do jogador, com o head bob aplicado no eixo Y
        this.camera.position.x = this.position.x;
        this.camera.position.y = this.position.y + bobOffsetY;
        this.camera.position.z = this.position.z;
    }
    
    update(deltaTime, keys, collisionCheck) {
        // ===== 1. ENERGIA E INTENSIDADE =====
        if (this.energy > 0) {
            this.energy = Math.max(0, this.energy - this.drainRate * deltaTime);
            let intensity = 0.5 + (this.baseIntensity - 0.5) * this.energy;
            intensity *= this.intensityMultiplier;
            if (this.energy < 0.2) {
                intensity *= 0.8 + 0.4 * Math.sin(Date.now() * 0.02);
            }
            this.flashlight.intensity = intensity;
        } else {
            this.flashlight.intensity = 0;
        }
        
        // ===== 2. MOVIMENTO =====
        const moveSpeed = this.speed * deltaTime;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();
        
        const moveDelta = new THREE.Vector3();
        let moving = false;
        if (keys['KeyW']) { moveDelta.add(forward); moving = true; }
        if (keys['KeyS']) { moveDelta.sub(forward); moving = true; }
        if (keys['KeyA']) { moveDelta.sub(right); moving = true; }
        if (keys['KeyD']) { moveDelta.add(right); moving = true; }
        
        if (moveDelta.length() > 0) {
            moveDelta.normalize();
            moveDelta.multiplyScalar(moveSpeed);
            if (!collisionCheck || !collisionCheck(moveDelta)) {
                this.position.add(moveDelta);
            }
        }
        
        // ===== 3. HEAD BOB (apenas vertical, sem rotação) =====
        let bobY = 0;
        if (this.bobEnabled && moving) {
            this.isMoving = true;
            this.bobTimer += deltaTime * this.bobSpeed;
            bobY = Math.sin(this.bobTimer) * this.bobAmount;
        } else {
            this.isMoving = false;
            // Reduz gradualmente o timer para suavizar
            this.bobTimer *= 0.9;
            bobY = Math.sin(this.bobTimer) * this.bobAmount * 0.2;
        }
        
        // Aplica a posição final da câmara
        this.updateCameraPosition(bobY);
        
        // ===== 4. POSIÇÃO DA LANTERNA (acompanha a câmara) =====
        // A lanterna deve ser posicionada em relação à câmara, mas como a câmara já tem o bob,
        // podemos usar a posição da câmara + offset (convertido para direção da câmara)
        const offsetWorld = this.flashlightOffset.clone().applyQuaternion(this.camera.quaternion);
        const lightPos = this.camera.position.clone().add(offsetWorld);
        this.flashlight.position.copy(lightPos);
        
        // Alvo da lanterna: 15 unidades à frente da câmara
        const targetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const targetPos = this.camera.position.clone().add(targetDir.multiplyScalar(15));
        this.flightlightTarget.position.copy(targetPos);
    }
    
    recharge(amount, isCrystal = false) {
        this.energy = Math.min(1.0, this.energy + amount);
        if (isCrystal) {
            this.intensityMultiplier += 0.1;
            this.intensityMultiplier = Math.min(3.0, this.intensityMultiplier);
            console.log(`💪 Intensidade da lanterna: ${(this.intensityMultiplier * 100).toFixed(0)}%`);
        }
    }
}