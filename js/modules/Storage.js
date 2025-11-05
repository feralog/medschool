/**
 * Storage.js - Gerenciamento de LocalStorage Multi-Usuário
 *
 * Substitui o sistema antigo que usava uma única chave para todos os usuários
 * Agora cada usuário tem seu próprio espaço de dados
 */

class StorageManager {
    constructor() {
        this.storagePrefix = 'quizMedico_';
        this.currentUserKey = 'currentUser';
        this.usersListKey = 'usersList';
        this.autoSaveInterval = null;
        this.autoSaveDelay = 3000; // 3 segundos (com debounce)
        this.pendingSave = false;
    }

    /**
     * Salvar dados de um usuário específico
     */
    saveUserData(userId, data) {
        try {
            const key = this.getUserKey(userId);
            const dataToSave = {
                ...data,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(key, JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);

            // Se o erro for de quota excedida, tentar limpar dados antigos
            if (error.name === 'QuotaExceededError') {
                this.cleanOldData();
                return false;
            }
            return false;
        }
    }

    /**
     * Carregar dados de um usuário específico
     */
    loadUserData(userId) {
        try {
            const key = this.getUserKey(userId);
            const data = localStorage.getItem(key);

            if (!data) {
                return this.createEmptyUserData(userId);
            }

            const parsed = JSON.parse(data);

            // Validar estrutura básica
            if (!parsed.userId || !parsed.progress) {
                console.warn('Dados de usuário com estrutura inválida, criando novo');
                return this.createEmptyUserData(userId);
            }

            return parsed;
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            return this.createEmptyUserData(userId);
        }
    }

    /**
     * Criar estrutura de dados vazia para novo usuário
     */
    createEmptyUserData(userId) {
        return {
            userId: userId,
            progress: {}, // { moduleId: { questionId: { seen, correct, incorrect, lastSeen } } }
            sessions: [], // Histórico de sessões
            statistics: {
                totalQuestions: 0,
                totalCorrect: 0,
                totalIncorrect: 0,
                totalTime: 0,
                lastActivity: null,
                streakDays: 0,
                longestStreak: 0
            },
            lastModule: null, // Último módulo acessado
            lastQuestionIndex: 0, // Última questão vista
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Atualizar progresso de uma questão específica
     */
    updateQuestionProgress(userId, moduleId, questionIndex, isCorrect) {
        const userData = this.loadUserData(userId);

        if (!userData.progress[moduleId]) {
            userData.progress[moduleId] = {};
        }

        const questionId = `${moduleId}_${questionIndex}`;

        if (!userData.progress[moduleId][questionId]) {
            userData.progress[moduleId][questionId] = {
                seen: 0,
                correct: 0,
                incorrect: 0,
                lastSeen: null
            };
        }

        const questionProgress = userData.progress[moduleId][questionId];
        questionProgress.seen += 1;

        if (isCorrect) {
            questionProgress.correct += 1;
            userData.statistics.totalCorrect += 1;
        } else {
            questionProgress.incorrect += 1;
            userData.statistics.totalIncorrect += 1;
        }

        questionProgress.lastSeen = new Date().toISOString();
        userData.statistics.lastActivity = new Date().toISOString();
        userData.statistics.totalQuestions += 1;

        this.saveUserData(userId, userData);
        return questionProgress;
    }

    /**
     * Salvar posição atual no módulo (onde parou)
     */
    saveModulePosition(userId, moduleId, questionIndex) {
        const userData = this.loadUserData(userId);
        userData.lastModule = moduleId;
        userData.lastQuestionIndex = questionIndex;
        this.saveUserData(userId, userData);
    }

    /**
     * Obter posição salva no módulo
     */
    getModulePosition(userId, moduleId) {
        const userData = this.loadUserData(userId);

        if (userData.lastModule === moduleId && userData.lastQuestionIndex !== undefined) {
            return {
                questionIndex: userData.lastQuestionIndex,
                hasPosition: true
            };
        }

        return {
            questionIndex: 0,
            hasPosition: false
        };
    }

    /**
     * Registrar sessão de quiz completa
     */
    saveQuizSession(userId, sessionData) {
        const userData = this.loadUserData(userId);

        const session = {
            moduleId: sessionData.moduleId,
            mode: sessionData.mode,
            correctCount: sessionData.correctCount,
            incorrectCount: sessionData.incorrectCount,
            totalQuestions: sessionData.totalQuestions,
            timeSpent: sessionData.timeSpent,
            score: Math.round((sessionData.correctCount / sessionData.totalQuestions) * 100),
            completedAt: new Date().toISOString()
        };

        userData.sessions.push(session);
        userData.statistics.totalTime += sessionData.timeSpent;

        // Manter apenas últimas 100 sessões para não crescer demais
        if (userData.sessions.length > 100) {
            userData.sessions = userData.sessions.slice(-100);
        }

        this.saveUserData(userId, userData);
        return session;
    }

    /**
     * Calcular progresso de um módulo
     */
    calculateModuleProgress(userId, moduleId, totalQuestions) {
        const userData = this.loadUserData(userId);
        const moduleProgress = userData.progress[moduleId] || {};

        let seenCount = 0;
        let correctCount = 0;

        for (let i = 0; i < totalQuestions; i++) {
            const questionId = `${moduleId}_${i}`;
            const questionProgress = moduleProgress[questionId];

            if (questionProgress) {
                if (questionProgress.seen > 0) seenCount++;
                if (questionProgress.correct > 0) correctCount++;
            }
        }

        return {
            seen: seenCount,
            correct: correctCount,
            total: totalQuestions,
            seenPercentage: Math.round((seenCount / totalQuestions) * 100),
            correctPercentage: Math.round((correctCount / totalQuestions) * 100)
        };
    }

    /**
     * Obter histórico de sessões
     */
    getSessionHistory(userId, limit = 10) {
        const userData = this.loadUserData(userId);
        return userData.sessions.slice(-limit).reverse();
    }

    /**
     * Obter estatísticas do usuário
     */
    getUserStatistics(userId) {
        const userData = this.loadUserData(userId);
        return {
            ...userData.statistics,
            totalSessions: userData.sessions.length,
            averageScore: this.calculateAverageScore(userData.sessions),
            recentActivity: this.getRecentActivity(userData.sessions)
        };
    }

    /**
     * Calcular score médio
     */
    calculateAverageScore(sessions) {
        if (sessions.length === 0) return 0;
        const totalScore = sessions.reduce((sum, session) => sum + session.score, 0);
        return Math.round(totalScore / sessions.length);
    }

    /**
     * Obter atividade recente (últimos 7 dias)
     */
    getRecentActivity(sessions) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return sessions.filter(session => {
            const sessionDate = new Date(session.completedAt);
            return sessionDate >= sevenDaysAgo;
        }).length;
    }

    /**
     * Gerenciar lista de usuários registrados
     */
    saveUserToList(userInfo) {
        const users = this.getUsersList();

        // Verificar se usuário já existe
        const existingIndex = users.findIndex(u => u.id === userInfo.id);

        if (existingIndex >= 0) {
            users[existingIndex] = { ...users[existingIndex], ...userInfo };
        } else {
            users.push(userInfo);
        }

        localStorage.setItem(this.usersListKey, JSON.stringify(users));
    }

    /**
     * Obter lista de todos os usuários
     */
    getUsersList() {
        try {
            const data = localStorage.getItem(this.usersListKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao carregar lista de usuários:', error);
            return [];
        }
    }

    /**
     * Encontrar usuário por email
     */
    findUserByEmail(email) {
        const users = this.getUsersList();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    /**
     * Definir usuário atual
     */
    setCurrentUser(userId) {
        localStorage.setItem(this.currentUserKey, userId);
    }

    /**
     * Obter usuário atual
     */
    getCurrentUser() {
        return localStorage.getItem(this.currentUserKey);
    }

    /**
     * Limpar usuário atual (logout)
     */
    clearCurrentUser() {
        localStorage.removeItem(this.currentUserKey);
    }

    /**
     * Limpar dados antigos (otimização de espaço)
     */
    cleanOldData() {
        console.warn('Limpando dados antigos para liberar espaço...');

        const users = this.getUsersList();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        users.forEach(user => {
            const userData = this.loadUserData(user.id);

            // Remover sessões antigas
            userData.sessions = userData.sessions.filter(session => {
                const sessionDate = new Date(session.completedAt);
                return sessionDate >= sixMonthsAgo;
            });

            this.saveUserData(user.id, userData);
        });
    }

    /**
     * Obter chave única para usuário
     */
    getUserKey(userId) {
        return `${this.storagePrefix}user_${userId}`;
    }

    /**
     * Auto-save com debounce
     */
    scheduleSave(userId, data) {
        this.pendingSave = { userId, data };

        if (!this.autoSaveInterval) {
            this.autoSaveInterval = setTimeout(() => {
                if (this.pendingSave) {
                    this.saveUserData(this.pendingSave.userId, this.pendingSave.data);
                    this.pendingSave = null;
                }
                this.autoSaveInterval = null;
            }, this.autoSaveDelay);
        }
    }

    /**
     * Exportar dados do usuário (para backup)
     */
    exportUserData(userId) {
        const userData = this.loadUserData(userId);
        const userInfo = this.getUsersList().find(u => u.id === userId);

        return {
            userInfo,
            userData,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Importar dados do usuário (restore de backup)
     */
    importUserData(exportedData) {
        try {
            if (exportedData.userInfo) {
                this.saveUserToList(exportedData.userInfo);
            }
            if (exportedData.userData) {
                this.saveUserData(exportedData.userData.userId, exportedData.userData);
            }
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }

    /**
     * Limpar todos os dados (use com cuidado!)
     */
    clearAllData() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.storagePrefix) || key === this.usersListKey || key === this.currentUserKey) {
                localStorage.removeItem(key);
            }
        });
    }
}

// Singleton
const storage = new StorageManager();

// Exportar para uso global
window.Storage = storage;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = storage;
}
