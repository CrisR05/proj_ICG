import * as THREE from 'three';

export class CollisionSystem {
    constructor() {
        this.raycaster = new THREE.Raycaster();
    }
    
    checkCollision(position, direction, distance, walls) {
        this.raycaster.set(position, direction.normalize());
        const intersects = this.raycaster.intersectObjects(walls);
        return intersects.length > 0 && intersects[0].distance < distance;
    }
    
    checkProximity(position, target, threshold) {
        return position.distanceTo(target) < threshold;
    }
}