import './styles/main.css';
import { Game } from './core/Game';

// Inicializa o jogo quando a página carregar
window.addEventListener('load', () => {
    const game = new Game();
    game.start();
});