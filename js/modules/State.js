/**
 * State.js - Gerenciador Centralizado de Estado
 *
 * Substitui as 20+ variáveis globais do app.js original
 * Implementa padrão Observer para reatividade
 */

class AppState {
    constructor() {
        // Estado inicial da aplicação
        this.state = {
            // Autenticação e usuário
            user: {
                id: null,
                username: '',
                email: '',
                isAuthenticated: false,
                createdAt: null
            },

            // Seleção atual
            selection: {
                specialty: '',
                subcategory: '',
                module: '',
                moduleData: null
            },

            // Estado do quiz
            quiz: {
                mode: 'quiz', // 'quiz' ou 'mentor'
                questions: [],
                currentIndex: 0,
                startTime: null,
                elapsedSeconds: 0,
                timerInterval: null
            },

            // Respostas da sessão atual
            session: {
                answers: {}, // { questionIndex: selectedOptionIndex }
                confirmed: {}, // { questionIndex: boolean } (para modo mentor)
                states: {}, // { questionIndex: 'answered'|'current'|'unanswered' }
                correctCount: 0,
                incorrectCount: 0
            },

            // Navegação
            navigation: {
                currentScreen: 'login',
                scrollOffset: 0,
                visibleButtonsCount: 10
            },

            // Leitura de conteúdo (Resumos/Guias)
            content: {
                type: '', // 'resumos' ou 'guias'
                fileName: '',
                fileContent: ''
            }
        };

        // Observers (listeners de mudança de estado)
        this.observers = {};
    }

    /**
     * Obter estado completo
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Obter parte específica do estado
     */
    get(path) {
        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === undefined || value === null) return null;
            value = value[key];
        }

        return value;
    }

    /**
     * Atualizar estado (imutável)
     */
    set(path, value) {
        const keys = path.split('.');
        const newState = JSON.parse(JSON.stringify(this.state)); // Deep clone

        let current = newState;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        this.state = newState;

        // Notificar observers
        this.notify(path, value);
    }

    /**
     * Atualizar múltiplos campos de uma vez
     */
    update(updates) {
        Object.keys(updates).forEach(path => {
            this.set(path, updates[path]);
        });
    }

    /**
     * Resetar sessão de quiz
     */
    resetQuizSession() {
        this.update({
            'quiz.currentIndex': 0,
            'quiz.startTime': null,
            'quiz.elapsedSeconds': 0,
            'session.answers': {},
            'session.confirmed': {},
            'session.states': {},
            'session.correctCount': 0,
            'session.incorrectCount': 0
        });
    }

    /**
     * Resetar seleção
     */
    resetSelection() {
        this.update({
            'selection.specialty': '',
            'selection.subcategory': '',
            'selection.module': '',
            'selection.moduleData': null
        });
    }

    /**
     * Login do usuário
     */
    login(userData) {
        this.update({
            'user.id': userData.id,
            'user.username': userData.username,
            'user.email': userData.email,
            'user.isAuthenticated': true
        });
    }

    /**
     * Logout do usuário
     */
    logout() {
        this.update({
            'user.id': null,
            'user.username': '',
            'user.email': '',
            'user.isAuthenticated': false
        });
        this.resetSelection();
        this.resetQuizSession();
    }

    /**
     * Registrar observer para mudanças de estado
     */
    subscribe(path, callback) {
        if (!this.observers[path]) {
            this.observers[path] = [];
        }
        this.observers[path].push(callback);

        // Retorna função para cancelar subscription
        return () => {
            this.observers[path] = this.observers[path].filter(cb => cb !== callback);
        };
    }

    /**
     * Notificar observers
     */
    notify(path, value) {
        // Notificar observers específicos do path
        if (this.observers[path]) {
            this.observers[path].forEach(callback => callback(value, path));
        }

        // Notificar observers de paths pai (ex: 'user' quando 'user.username' muda)
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.observers[parentPath]) {
                this.observers[parentPath].forEach(callback => {
                    callback(this.get(parentPath), parentPath);
                });
            }
        }
    }

    /**
     * Debug - imprimir estado atual
     */
    debug() {
        console.log('=== ESTADO ATUAL DA APLICAÇÃO ===');
        console.log(JSON.stringify(this.state, null, 2));
    }
}

// Singleton - instância única do estado
const appState = new AppState();

// Exportar para uso global
window.AppState = appState;

// Para módulos ES6 (futuro)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = appState;
}
