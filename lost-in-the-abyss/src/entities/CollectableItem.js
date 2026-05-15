// src/entities/CollectableItem.js
export class PickaxeItem extends THREE.Group {
    constructor(x, z) {
        super();
        this.position.set(x, 0.5, z);
        
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a });
        const headMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, metalness: 0.8 });
        
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), handleMat);
        handle.position.y = 0.3;
        this.add(handle);
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.2), headMat);
        head.position.set(0, 0.6, 0);
        head.rotation.z = 0.2;
        this.add(head);
        
        // Glow effect
        const glow = new THREE.PointLight(0xffaa66, 0.5, 2);
        glow.position.set(0, 0.4, 0);
        this.add(glow);
    }
}