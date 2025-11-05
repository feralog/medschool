/**
 * API.js - Camada de Comunicação com Backend
 *
 * Versão atual: Carregamento local de JSONs
 * Versão futura: Firebase/Firestore
 *
 * Todas as chamadas são async para facilitar migração
 */

class APIManager {
    constructor() {
        this.useFirebase = true; // Firebase ativado!
        this.questionsCache = {}; // Cache de questões carregadas
        this.loadingPromises = {}; // Prevenir carregamentos duplicados
    }

    /**
     * Carregar questões de um módulo específico (LAZY LOADING)
     */
    async loadModuleQuestions(moduleId) {
        // Se já está em cache, retornar imediatamente
        if (this.questionsCache[moduleId]) {
            return {
                success: true,
                questions: this.questionsCache[moduleId]
            };
        }

        // Se já está carregando, retornar a promise existente
        if (this.loadingPromises[moduleId]) {
            return this.loadingPromises[moduleId];
        }

        // Criar nova promise de carregamento
        this.loadingPromises[moduleId] = (async () => {
            try {
                if (this.useFirebase) {
                    return await this.loadFromFirebase(moduleId);
                } else {
                    return await this.loadFromLocal(moduleId);
                }
            } finally {
                delete this.loadingPromises[moduleId];
            }
        })();

        return this.loadingPromises[moduleId];
    }

    /**
     * Carregar questões do sistema local
     */
    async loadFromLocal(moduleId) {
        const moduleConfig = this.findModuleConfig(moduleId);

        if (!moduleConfig) {
            return {
                success: false,
                error: `Módulo ${moduleId} não encontrado na configuração`
            };
        }

        try {
            const response = await fetch(`${moduleConfig.file}.json`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const questions = await response.json();

            // Validar estrutura das questões
            const validationResult = this.validateQuestions(questions, moduleId);
            if (!validationResult.valid) {
                return {
                    success: false,
                    error: validationResult.error
                };
            }

            // Armazenar em cache
            this.questionsCache[moduleId] = questions;

            return {
                success: true,
                questions: questions
            };

        } catch (error) {
            console.error(`Erro ao carregar módulo ${moduleId}:`, error);
            return {
                success: false,
                error: `Falha ao carregar: ${error.message}`
            };
        }
    }

    /**
     * Carregar questões do Firebase
     */
    async loadFromFirebase(moduleId) {
        try {
            // Buscar questões no Firestore
            const questionsSnapshot = await window.firebaseDb
                .collection('modules')
                .doc(moduleId)
                .collection('questions')
                .orderBy('order')
                .get();

            if (questionsSnapshot.empty) {
                return {
                    success: false,
                    error: `Nenhuma questão encontrada para o módulo ${moduleId}. Execute o script de migração.`
                };
            }

            const questions = [];
            questionsSnapshot.forEach(doc => {
                questions.push(doc.data());
            });

            // Armazenar em cache
            this.questionsCache[moduleId] = questions;

            console.log(`✓ Carregadas ${questions.length} questões do módulo ${moduleId} (Firebase)`);

            return {
                success: true,
                questions: questions
            };

        } catch (error) {
            console.error(`Erro ao carregar módulo ${moduleId} do Firebase:`, error);
            return {
                success: false,
                error: `Falha ao carregar do Firebase: ${error.message}`
            };
        }
    }

    /**
     * Encontrar configuração de um módulo
     */
    findModuleConfig(moduleId) {
        for (const specialty of Object.values(quizConfig.specialties)) {
            // Verificar se tem subcategorias
            if (specialty.hasSubcategories && specialty.subcategories) {
                for (const subcategory of Object.values(specialty.subcategories)) {
                    const module = subcategory.modules?.find(m => m.id === moduleId);
                    if (module) return module;
                }
            } else if (specialty.modules) {
                const module = specialty.modules.find(m => m.id === moduleId);
                if (module) return module;
            }
        }
        return null;
    }

    /**
     * Validar estrutura das questões
     */
    validateQuestions(questions, moduleId) {
        if (!Array.isArray(questions)) {
            return {
                valid: false,
                error: `Módulo ${moduleId}: Esperado array de questões`
            };
        }

        if (questions.length === 0) {
            return {
                valid: false,
                error: `Módulo ${moduleId}: Nenhuma questão encontrada`
            };
        }

        // Validar cada questão
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            // Campos obrigatórios
            if (!q.question || typeof q.question !== 'string') {
                return {
                    valid: false,
                    error: `Módulo ${moduleId}, questão ${i}: Campo 'question' inválido`
                };
            }

            if (!Array.isArray(q.options) || q.options.length < 2) {
                return {
                    valid: false,
                    error: `Módulo ${moduleId}, questão ${i}: Campo 'options' deve ter pelo menos 2 opções`
                };
            }

            if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
                return {
                    valid: false,
                    error: `Módulo ${moduleId}, questão ${i}: 'correctIndex' inválido`
                };
            }

            if (!q.explanation || typeof q.explanation !== 'string') {
                return {
                    valid: false,
                    error: `Módulo ${moduleId}, questão ${i}: Campo 'explanation' inválido`
                };
            }

            // Type é opcional mas deve ser válido se fornecido
            if (q.type && !['conteudista', 'raciocínio'].includes(q.type)) {
                return {
                    valid: false,
                    error: `Módulo ${moduleId}, questão ${i}: 'type' deve ser 'conteudista' ou 'raciocínio'`
                };
            }

            // Image é opcional
        }

        return { valid: true };
    }

    /**
     * Carregar arquivo de conteúdo (Resumo ou Guia)
     */
    async loadContentFile(specialty, subcategory, type, fileName) {
        try {
            let filePath;

            // Construir caminho do arquivo baseado na especialidade
            if (subcategory) {
                filePath = `subjects/${specialty}/AVC ${subcategory}/${specialty}${type}/${fileName}`;
            } else {
                filePath = `subjects/${specialty}/${specialty}${type}/${fileName}`;
            }

            const response = await fetch(filePath);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();

            return {
                success: true,
                content: content,
                fileName: fileName
            };

        } catch (error) {
            console.error(`Erro ao carregar arquivo ${fileName}:`, error);
            return {
                success: false,
                error: `Falha ao carregar arquivo: ${error.message}`
            };
        }
    }

    /**
     * Salvar progresso do usuário
     */
    async saveProgress(userId, moduleId, questionIndex, isCorrect) {
        if (this.useFirebase) {
            return await this.saveProgressFirebase(userId, moduleId, questionIndex, isCorrect);
        } else {
            return this.saveProgressLocal(userId, moduleId, questionIndex, isCorrect);
        }
    }

    /**
     * Salvar progresso localmente
     */
    saveProgressLocal(userId, moduleId, questionIndex, isCorrect) {
        const progress = window.Storage.updateQuestionProgress(userId, moduleId, questionIndex, isCorrect);

        return {
            success: true,
            progress: progress
        };
    }

    /**
     * Salvar progresso no Firebase
     */
    async saveProgressFirebase(userId, moduleId, questionIndex, isCorrect) {
        try {
            const questionId = `${moduleId}_${questionIndex}`;

            // Referência do progresso
            const progressRef = window.firebaseDb
                .collection('users')
                .doc(userId)
                .collection('progress')
                .doc(questionId);

            // Obter progresso atual
            const doc = await progressRef.get();
            const currentProgress = doc.exists ? doc.data() : {
                seen: 0,
                correct: 0,
                incorrect: 0,
                lastSeen: null
            };

            // Atualizar
            currentProgress.seen += 1;
            if (isCorrect) {
                currentProgress.correct += 1;
            } else {
                currentProgress.incorrect += 1;
            }
            currentProgress.lastSeen = firebase.firestore.FieldValue.serverTimestamp();
            currentProgress.moduleId = moduleId;
            currentProgress.questionIndex = questionIndex;

            // Salvar
            await progressRef.set(currentProgress);

            console.log(`✓ Progresso salvo (Firebase): ${questionId}`);

            return {
                success: true,
                progress: currentProgress
            };

        } catch (error) {
            console.error('Erro ao salvar progresso no Firebase:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Salvar sessão completa de quiz
     */
    async saveQuizSession(userId, sessionData) {
        if (this.useFirebase) {
            return await this.saveSessionFirebase(userId, sessionData);
        } else {
            return this.saveSessionLocal(userId, sessionData);
        }
    }

    /**
     * Salvar sessão localmente
     */
    saveSessionLocal(userId, sessionData) {
        const session = window.Storage.saveQuizSession(userId, sessionData);

        return {
            success: true,
            session: session
        };
    }

    /**
     * Salvar sessão no Firebase
     */
    async saveSessionFirebase(userId, sessionData) {
        try {
            const session = {
                moduleId: sessionData.moduleId,
                mode: sessionData.mode,
                correctCount: sessionData.correctCount,
                incorrectCount: sessionData.incorrectCount,
                totalQuestions: sessionData.totalQuestions,
                timeSpent: sessionData.timeSpent,
                score: Math.round((sessionData.correctCount / sessionData.totalQuestions) * 100),
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Adicionar à coleção de sessões
            await window.firebaseDb
                .collection('users')
                .doc(userId)
                .collection('sessions')
                .add(session);

            console.log('✓ Sessão salva (Firebase)');

            return {
                success: true,
                session: session
            };

        } catch (error) {
            console.error('Erro ao salvar sessão no Firebase:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obter progresso do módulo
     */
    async getModuleProgress(userId, moduleId) {
        if (this.useFirebase) {
            return await this.getProgressFirebase(userId, moduleId);
        } else {
            return this.getProgressLocal(userId, moduleId);
        }
    }

    /**
     * Obter progresso localmente
     */
    getProgressLocal(userId, moduleId) {
        // Primeiro carregar questões para saber total
        const questions = this.questionsCache[moduleId];

        if (!questions) {
            return {
                success: false,
                error: 'Módulo não carregado'
            };
        }

        const progress = window.Storage.calculateModuleProgress(userId, moduleId, questions.length);

        return {
            success: true,
            progress: progress
        };
    }

    /**
     * Obter progresso do Firebase
     */
    async getProgressFirebase(userId, moduleId) {
        try {
            // Buscar todas as questões do módulo para saber total
            const questions = this.questionsCache[moduleId];

            if (!questions) {
                return {
                    success: false,
                    error: 'Módulo não carregado'
                };
            }

            // Buscar progresso do usuário para este módulo
            const progressSnapshot = await window.firebaseDb
                .collection('users')
                .doc(userId)
                .collection('progress')
                .where('moduleId', '==', moduleId)
                .get();

            let seenCount = 0;
            let correctCount = 0;

            progressSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.seen > 0) seenCount++;
                if (data.correct > 0) correctCount++;
            });

            const progress = {
                seen: seenCount,
                correct: correctCount,
                total: questions.length,
                seenPercentage: Math.round((seenCount / questions.length) * 100),
                correctPercentage: Math.round((correctCount / questions.length) * 100)
            };

            return {
                success: true,
                progress: progress
            };

        } catch (error) {
            console.error('Erro ao obter progresso do Firebase:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obter estatísticas do usuário
     */
    async getUserStatistics(userId) {
        if (this.useFirebase) {
            return await this.getStatisticsFirebase(userId);
        } else {
            return this.getStatisticsLocal(userId);
        }
    }

    /**
     * Obter estatísticas localmente
     */
    getStatisticsLocal(userId) {
        const statistics = window.Storage.getUserStatistics(userId);

        return {
            success: true,
            statistics: statistics
        };
    }

    /**
     * Obter estatísticas do Firebase
     */
    async getStatisticsFirebase(userId) {
        try {
            // Buscar todas as sessões do usuário
            const sessionsSnapshot = await window.firebaseDb
                .collection('users')
                .doc(userId)
                .collection('sessions')
                .orderBy('completedAt', 'desc')
                .limit(100)  // Últimas 100 sessões
                .get();

            const sessions = [];
            sessionsSnapshot.forEach(doc => {
                const data = doc.data();
                // Converter timestamp para ISO string
                if (data.completedAt && data.completedAt.toDate) {
                    data.completedAt = data.completedAt.toDate().toISOString();
                }
                sessions.push(data);
            });

            // Calcular estatísticas
            const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);
            const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
            const totalIncorrect = sessions.reduce((sum, s) => sum + s.incorrectCount, 0);
            const totalTime = sessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0);
            const averageScore = sessions.length > 0
                ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
                : 0;

            const statistics = {
                totalQuestions,
                totalCorrect,
                totalIncorrect,
                totalTime,
                totalSessions: sessions.length,
                averageScore,
                recentActivity: sessions.filter(s => {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return new Date(s.completedAt) >= sevenDaysAgo;
                }).length
            };

            return {
                success: true,
                statistics: statistics
            };

        } catch (error) {
            console.error('Erro ao obter estatísticas do Firebase:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Limpar cache (útil para forçar recarregamento)
     */
    clearCache() {
        this.questionsCache = {};
        console.log('Cache de questões limpo');
    }

    /**
     * Pré-carregar módulos (útil para UX)
     */
    async preloadModules(moduleIds) {
        const promises = moduleIds.map(moduleId => this.loadModuleQuestions(moduleId));
        const results = await Promise.allSettled(promises);

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        return {
            success: true,
            loaded: successful,
            failed: failed,
            total: results.length
        };
    }

    /**
     * Obter status do cache
     */
    getCacheStatus() {
        return {
            cachedModules: Object.keys(this.questionsCache).length,
            modules: Object.keys(this.questionsCache),
            totalQuestions: Object.values(this.questionsCache).reduce((sum, q) => sum + q.length, 0)
        };
    }
}

// Singleton
const api = new APIManager();

// Exportar para uso global
window.API = api;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
