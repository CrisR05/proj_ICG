export class UIManager {
    constructor() {
        // Elementos da UI do jogo
        this.levelEl = document.getElementById('level-indicator');
        this.crystalEl = document.getElementById('crystal-counter');
        this.energyFill = document.getElementById('energy-fill-inner');
        this.energyText = document.getElementById('energy-text');
        this.messageEl = document.getElementById('message');
        this.messageTimeout = null;
        this.uiContainer = document.getElementById('ui-container');

        // Callbacks
        this.onStartGame = null;
        this.onResume = null;
        this.onRestartLevel = null;
        this.onExitToMenu = null;

        this.maxLevels = 20;
        this.selectedLevels = 10;

        this.createMenuElements();
        
        // Inicialmente esconde a UI do jogo
        this.hideGameUI();
    }

    createMenuElements() {
        // Remove menus antigos se existirem
        const oldMenu = document.getElementById('main-menu');
        if (oldMenu) oldMenu.remove();
        const oldPause = document.getElementById('pause-menu');
        if (oldPause) oldPause.remove();

        // Menu principal
        const mainMenu = document.createElement('div');
        mainMenu.id = 'main-menu';
        mainMenu.className = 'menu-overlay';
        mainMenu.innerHTML = `
            <div class="menu-container">
                <h1 class="game-title">ABYSS</h1>
                <div class="menu-buttons">
                    <button id="new-game-btn" class="menu-btn">NEW GAME</button>
                    <button id="controls-btn" class="menu-btn">CONTROLS</button>
                    <button id="exit-game-btn" class="menu-btn">EXIT</button>
                </div>
                <div id="level-select-panel" style="display: none;">
                    <p class="menu-text">NUMBER OF LEVELS (MAX ${this.maxLevels})</p>
                    <input type="number" id="level-count-input" min="1" max="${this.maxLevels}" value="10">
                    <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
                        <button id="confirm-levels-btn" class="menu-btn-small">START</button>
                        <button id="cancel-levels-btn" class="menu-btn-small">BACK</button>
                    </div>
                </div>
                <div id="controls-panel" style="display: none;">
                    <p>W / A / S / D - Move</p>
                    <p>MOUSE - Look around</p>
                    <p>ESC - Pause menu</p>
                    <p>Click on game to lock cursor</p>
                    <button id="back-to-menu-btn" class="menu-btn-small">BACK</button>
                </div>
            </div>
        `;
        document.body.appendChild(mainMenu);
        this.mainMenu = mainMenu;

        // Menu de pausa
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pause-menu';
        pauseMenu.className = 'menu-overlay';
        pauseMenu.style.display = 'none';
        pauseMenu.innerHTML = `
            <div class="menu-container">
                <h2>PAUSED</h2>
                <div class="menu-buttons">
                    <button id="resume-btn" class="menu-btn">RESUME</button>
                    <button id="restart-level-btn" class="menu-btn">RESTART LEVEL</button>
                    <button id="exit-to-menu-btn" class="menu-btn">EXIT TO MENU</button>
                </div>
            </div>
        `;
        document.body.appendChild(pauseMenu);
        this.pauseMenu = pauseMenu;

        // Estilos CSS
        if (!document.getElementById('menu-styles')) {
            const style = document.createElement('style');
            style.id = 'menu-styles';
            style.textContent = `
                .menu-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.92);
                    backdrop-filter: blur(4px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    font-family: 'Courier New', monospace;
                }
                .menu-container {
                    text-align: center;
                    background: rgba(10, 10, 15, 0.9);
                    padding: 40px 60px;
                    border: 2px solid #8b0000;
                    border-radius: 8px;
                    box-shadow: 0 0 30px rgba(139, 0, 0, 0.6);
                    min-width: 350px;
                }
                .game-title {
                    color: #8b0000;
                    font-size: 48px;
                    margin-bottom: 40px;
                    text-shadow: 0 0 8px #ff0000;
                    letter-spacing: 4px;
                }
                h2 {
                    color: #cc0000;
                    font-size: 36px;
                    margin-bottom: 30px;
                }
                .menu-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .menu-btn {
                    background: #111;
                    color: #cc0000;
                    border: 2px solid #8b0000;
                    padding: 12px 30px;
                    font-size: 24px;
                    font-family: 'Courier New', monospace;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                }
                .menu-btn:hover {
                    background: #8b0000;
                    color: #fff;
                    border-color: #ff4444;
                    box-shadow: 0 0 15px #ff0000;
                }
                .menu-btn-small {
                    background: #1a1a1a;
                    color: #cc0000;
                    border: 1px solid #8b0000;
                    padding: 8px 20px;
                    font-size: 18px;
                    cursor: pointer;
                    font-family: 'Courier New', monospace;
                }
                .menu-btn-small:hover {
                    background: #8b0000;
                    color: white;
                }
                .menu-text {
                    color: #ccc;
                    font-size: 18px;
                    margin: 15px 0;
                }
                #level-select-panel input {
                    background: #222;
                    border: 1px solid #8b0000;
                    color: #fff;
                    font-size: 20px;
                    padding: 8px;
                    width: 100px;
                    text-align: center;
                    font-family: monospace;
                    margin: 10px auto;
                }
                #controls-panel {
                    margin-top: 25px;
                    color: #aaa;
                    font-size: 16px;
                    text-align: left;
                    background: rgba(0,0,0,0.7);
                    padding: 15px 25px;
                    border: 1px solid #8b0000;
                    border-radius: 4px;
                }
                .hidden {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Bind dos eventos
        this.bindButtons();
    }

    bindButtons() {
        const newGameBtn = document.getElementById('new-game-btn');
        const controlsBtn = document.getElementById('controls-btn');
        const exitBtn = document.getElementById('exit-game-btn');
        const confirmBtn = document.getElementById('confirm-levels-btn');
        const cancelBtn = document.getElementById('cancel-levels-btn');
        const backBtn = document.getElementById('back-to-menu-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const restartBtn = document.getElementById('restart-level-btn');
        const exitToMenuBtn = document.getElementById('exit-to-menu-btn');

        if (newGameBtn) newGameBtn.onclick = () => this.showLevelSelector();
        if (controlsBtn) controlsBtn.onclick = () => this.showControls();
        if (exitBtn) exitBtn.onclick = () => this.exitGame();
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const input = document.getElementById('level-count-input');
                let val = parseInt(input.value, 10);
                if (isNaN(val)) val = 5;
                val = Math.min(this.maxLevels, Math.max(1, val));
                this.selectedLevels = val;
                console.log(`Starting game with ${val} levels`);
                if (this.onStartGame) this.onStartGame(val);
                else console.error("onStartGame callback not defined!");
            };
        }
        if (cancelBtn) cancelBtn.onclick = () => this.hideLevelSelector();
        if (backBtn) backBtn.onclick = () => this.hideControls();
        
        if (resumeBtn) resumeBtn.onclick = () => this.onResume?.();
        if (restartBtn) restartBtn.onclick = () => this.onRestartLevel?.();
        if (exitToMenuBtn) exitToMenuBtn.onclick = () => this.onExitToMenu?.();
    }

    showLevelSelector() {
        const panel = document.getElementById('level-select-panel');
        const mainBtns = document.querySelector('#main-menu .menu-buttons');
        if (panel) panel.style.display = 'block';
        if (mainBtns) mainBtns.style.display = 'none';
    }

    hideLevelSelector() {
        const panel = document.getElementById('level-select-panel');
        const mainBtns = document.querySelector('#main-menu .menu-buttons');
        if (panel) panel.style.display = 'none';
        if (mainBtns) mainBtns.style.display = 'flex';
    }

    showControls() {
        const panel = document.getElementById('controls-panel');
        const mainBtns = document.querySelector('#main-menu .menu-buttons');
        if (panel) panel.style.display = 'block';
        if (mainBtns) mainBtns.style.display = 'none';
    }

    hideControls() {
        const panel = document.getElementById('controls-panel');
        const mainBtns = document.querySelector('#main-menu .menu-buttons');
        if (panel) panel.style.display = 'none';
        if (mainBtns) mainBtns.style.display = 'flex';
    }

    // ===== MÉTODOS PARA CONTROLAR A UI DO JOGO =====
    showGameUI() {
        if (this.uiContainer) this.uiContainer.classList.remove('hidden');
    }

    hideGameUI() {
        if (this.uiContainer) this.uiContainer.classList.add('hidden');
    }

    showMainMenu() {
        if (this.mainMenu) this.mainMenu.style.display = 'flex';
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
        this.hideGameUI();
        this.hideLevelSelector();
        this.hideControls();
    }

    hideMainMenu() {
        if (this.mainMenu) this.mainMenu.style.display = 'none';
        this.showGameUI();  // Mostra a UI do jogo quando o menu principal desaparece
    }

    showPauseMenu() {
        if (this.pauseMenu) this.pauseMenu.style.display = 'flex';
        this.hideGameUI();
    }

    hidePauseMenu() {
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
        this.showGameUI();
    }

    exitGame() {
        window.close();
        alert("Close the browser tab to exit the game.");
    }

    // ================= UI do jogo =================
    updateLevel(level, themeName) {
        if (this.levelEl) this.levelEl.innerHTML = `🗺️ LEVEL ${level} - ${themeName.toUpperCase()}`;
    }

    updateCrystals(collected, total) {
        if (this.crystalEl) this.crystalEl.innerHTML = `💎 CRYSTALS: ${collected}/${total}`;
    }

    updateEnergy(energy) {
        const percent = Math.round(energy * 100);
        if (this.energyFill) this.energyFill.style.width = `${percent}%`;
        if (this.energyText) this.energyText.textContent = `${percent}%`;
        
        // Muda cor baseada na energia
        if (energy < 0.2) {
            if (this.energyFill) this.energyFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
        } else if (energy < 0.5) {
            if (this.energyFill) this.energyFill.style.background = 'linear-gradient(90deg, #ff8800, #ffaa00)';
        } else {
            if (this.energyFill) this.energyFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffdd44)';
        }
    }

    showMessage(text, duration = 2000) {
        if (this.messageEl) {
            this.messageEl.textContent = text;
            this.messageEl.style.opacity = '1';
            if (this.messageTimeout) clearTimeout(this.messageTimeout);
            this.messageTimeout = setTimeout(() => {
                if (this.messageEl) this.messageEl.style.opacity = '0';
            }, duration);
        }
    }
}