// src/systems/InputManager.js
export class InputManager {
    constructor() {
        this.keys = {};
        
        // Propriedades para o sistema de combate
        this.attack = false;
        this.useItem = false;
        this.item1 = false;
        this.item2 = false;
        this.item3 = false;
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Processa inputs especiais para combate
            switch(e.code) {
                case 'Space':
                    this.attack = true;
                    e.preventDefault();
                    break;
                case 'KeyE':
                    this.useItem = true;
                    e.preventDefault();
                    break;
                case 'Digit1':
                    this.item1 = true;
                    e.preventDefault();
                    break;
                case 'Digit2':
                    this.item2 = true;
                    e.preventDefault();
                    break;
                case 'Digit3':
                    this.item3 = true;
                    e.preventDefault();
                    break;
                default:
                    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                        e.preventDefault();
                    }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            
            // Reseta inputs especiais
            switch(e.code) {
                case 'Space':
                    this.attack = false;
                    break;
                case 'KeyE':
                    this.useItem = false;
                    break;
                case 'Digit1':
                    this.item1 = false;
                    break;
                case 'Digit2':
                    this.item2 = false;
                    break;
                case 'Digit3':
                    this.item3 = false;
                    break;
            }
        });
    }
    
    update() {
        // Reseta flags de um único frame
        // Estas flags devem ser resetadas após serem lidas
        this.attack = false;
        this.useItem = false;
        this.item1 = false;
        this.item2 = false;
        this.item3 = false;
    }
    
    isKeyPressed(code) {
        return this.keys[code] === true;
    }
}