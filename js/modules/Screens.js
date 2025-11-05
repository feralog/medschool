/**
 * Screens.js - Gerenciamento de Telas
 * Centraliza navegação entre telas da aplicação
 */

class ScreenManager {
    constructor() {
        this.screens = {};
        this.currentScreen = null;
    }

    /**
     * Inicializar screens
     */
    init() {
        this.screens = {
            login: document.getElementById('login-screen'),
            register: document.getElementById('register-screen'),
            specialty: document.getElementById('specialty-selection'),
            subcategory: document.getElementById('subcategory-selection'),
            module: document.getElementById('module-selection'),
            mode: document.getElementById('mode-selection'),
            quiz: document.getElementById('quiz-screen'),
            review: document.getElementById('review-screen'),
            fileReading: document.getElementById('file-reading-screen'),
            statistics: document.getElementById('statistics-screen')
        };
    }

    /**
     * Esconder todas as telas
     */
    hideAll() {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.add('d-none');
        });
    }

    /**
     * Mostrar tela específica
     */
    show(screenName) {
        this.hideAll();

        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('d-none');
            this.currentScreen = screenName;
            window.AppState.set('navigation.currentScreen', screenName);
        } else {
            console.error(`Tela não encontrada: ${screenName}`);
        }
    }

    /**
     * Obter tela atual
     */
    getCurrent() {
        return this.currentScreen;
    }
}

const screens = new ScreenManager();
window.Screens = screens;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = screens;
}
