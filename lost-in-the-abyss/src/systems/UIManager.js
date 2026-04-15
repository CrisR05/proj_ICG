export class UIManager {
    constructor() {
        this.levelEl = document.getElementById('level-indicator');
        this.crystalEl = document.getElementById('crystal-counter');
        this.energyFill = document.getElementById('energy-fill-inner');
        this.energyText = document.getElementById('energy-text');
        this.messageEl = document.getElementById('message');
        
        this.messageTimeout = null;
    }
    
    updateLevel(level, themeName) {
        this.levelEl.innerHTML = `🗺️ NÍVEL ${level} - ${themeName.toUpperCase()}`;
    }
    
    updateCrystals(collected, total) {
        this.crystalEl.innerHTML = `💎 CRISTAIS: ${collected}/${total}`;
    }
    
    updateEnergy(energy) {
        const percent = Math.round(energy * 100);
        this.energyFill.style.width = `${percent}%`;
        this.energyText.textContent = `${percent}%`;
        
        // Muda cor baseado na energia
        if (energy < 0.2) {
            this.energyFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
        } else if (energy < 0.5) {
            this.energyFill.style.background = 'linear-gradient(90deg, #ff8800, #ffaa00)';
        } else {
            this.energyFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffdd44)';
        }
    }
    
    showMessage(text, duration = 2000) {
        this.messageEl.textContent = text;
        this.messageEl.style.opacity = '1';
        
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        this.messageTimeout = setTimeout(() => {
            this.messageEl.style.opacity = '0';
        }, duration);
    }
}