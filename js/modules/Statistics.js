/**
 * Statistics.js - Sistema de Estatísticas Avançadas
 *
 * Análises detalhadas de desempenho:
 * - Performance por módulo e especialidade
 * - Evolução temporal (gráficos)
 * - Análise por tipo de questão (conteudista vs raciocínio)
 * - Sequências de acertos (streaks)
 * - Questões problemáticas
 * - Tempo médio por questão
 */

class StatisticsManager {
    constructor() {
        this.chartColors = {
            primary: '#4f46e5',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#3b82f6'
        };
    }

    /**
     * Obter dashboard completo de estatísticas
     */
    getDashboard(userId) {
        return {
            overview: this.getOverview(userId),
            recentPerformance: this.getRecentPerformance(userId),
            moduleBreakdown: this.getModuleBreakdown(userId),
            timeAnalysis: this.getTimeAnalysis(userId),
            streaks: this.getStreaks(userId),
            problemQuestions: this.getProblemQuestions(userId),
            achievements: this.getAchievements(userId)
        };
    }

    /**
     * Visão geral (overview)
     */
    getOverview(userId) {
        const userData = window.Storage.loadUserData(userId);
        const stats = userData.statistics;

        const totalAnswered = stats.totalCorrect + stats.totalIncorrect;
        const accuracy = totalAnswered > 0 ? (stats.totalCorrect / totalAnswered) * 100 : 0;

        return {
            totalQuestions: stats.totalQuestions,
            totalCorrect: stats.totalCorrect,
            totalIncorrect: stats.totalIncorrect,
            accuracy: Math.round(accuracy),
            totalSessions: userData.sessions.length,
            totalTimeMinutes: Math.round(stats.totalTime / 60),
            currentStreak: stats.streakDays || 0,
            longestStreak: stats.longestStreak || 0,
            lastActivity: stats.lastActivity
        };
    }

    /**
     * Performance recente (últimos 7 dias)
     */
    getRecentPerformance(userId) {
        const userData = window.Storage.loadUserData(userId);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSessions = userData.sessions.filter(session => {
            const sessionDate = new Date(session.completedAt);
            return sessionDate >= sevenDaysAgo;
        });

        // Agrupar por dia
        const dailyData = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dailyData[dateKey] = {
                date: dateKey,
                sessions: 0,
                correct: 0,
                incorrect: 0,
                totalTime: 0
            };
        }

        recentSessions.forEach(session => {
            const dateKey = session.completedAt.split('T')[0];
            if (dailyData[dateKey]) {
                dailyData[dateKey].sessions += 1;
                dailyData[dateKey].correct += session.correctCount;
                dailyData[dateKey].incorrect += session.incorrectCount;
                dailyData[dateKey].totalTime += session.timeSpent;
            }
        });

        return {
            totalSessions: recentSessions.length,
            dailyData: Object.values(dailyData),
            averageScore: recentSessions.length > 0
                ? Math.round(recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length)
                : 0
        };
    }

    /**
     * Breakdown por módulo
     */
    getModuleBreakdown(userId) {
        const userData = window.Storage.loadUserData(userId);
        const moduleStats = {};

        // Analisar sessões
        userData.sessions.forEach(session => {
            if (!moduleStats[session.moduleId]) {
                moduleStats[session.moduleId] = {
                    moduleId: session.moduleId,
                    moduleName: this.getModuleName(session.moduleId),
                    sessions: 0,
                    totalQuestions: 0,
                    correctCount: 0,
                    incorrectCount: 0,
                    totalTime: 0,
                    bestScore: 0,
                    averageScore: 0
                };
            }

            const stats = moduleStats[session.moduleId];
            stats.sessions += 1;
            stats.totalQuestions += session.totalQuestions;
            stats.correctCount += session.correctCount;
            stats.incorrectCount += session.incorrectCount;
            stats.totalTime += session.timeSpent;
            stats.bestScore = Math.max(stats.bestScore, session.score);
        });

        // Calcular médias
        Object.values(moduleStats).forEach(stats => {
            stats.averageScore = Math.round(
                (stats.correctCount / stats.totalQuestions) * 100
            );
        });

        return Object.values(moduleStats).sort((a, b) => b.sessions - a.sessions);
    }

    /**
     * Análise temporal
     */
    getTimeAnalysis(userId) {
        const userData = window.Storage.loadUserData(userId);

        if (userData.sessions.length === 0) {
            return {
                averageSessionTime: 0,
                fastestSession: 0,
                longestSession: 0,
                totalTimeMinutes: 0,
                averageTimePerQuestion: 0
            };
        }

        const sessionTimes = userData.sessions.map(s => s.timeSpent);
        const totalTime = sessionTimes.reduce((sum, t) => sum + t, 0);
        const totalQuestions = userData.sessions.reduce((sum, s) => sum + s.totalQuestions, 0);

        return {
            averageSessionTime: Math.round(totalTime / userData.sessions.length),
            fastestSession: Math.min(...sessionTimes),
            longestSession: Math.max(...sessionTimes),
            totalTimeMinutes: Math.round(totalTime / 60),
            averageTimePerQuestion: totalQuestions > 0
                ? Math.round(totalTime / totalQuestions)
                : 0
        };
    }

    /**
     * Análise de sequências (streaks)
     */
    getStreaks(userId) {
        const userData = window.Storage.loadUserData(userId);

        if (userData.sessions.length === 0) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                streakHistory: []
            };
        }

        // Ordenar sessões por data
        const sortedSessions = [...userData.sessions].sort((a, b) =>
            new Date(a.completedAt) - new Date(b.completedAt)
        );

        // Calcular streak de dias consecutivos
        const uniqueDays = new Set();
        sortedSessions.forEach(session => {
            const dateKey = session.completedAt.split('T')[0];
            uniqueDays.add(dateKey);
        });

        const daysArray = Array.from(uniqueDays).sort();
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 1;

        for (let i = 1; i < daysArray.length; i++) {
            const prevDate = new Date(daysArray[i - 1]);
            const currDate = new Date(daysArray[i]);
            const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);

        // Verificar se último dia foi ontem ou hoje
        const lastDay = new Date(daysArray[daysArray.length - 1]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        lastDay.setHours(0, 0, 0, 0);

        if (lastDay.getTime() === today.getTime() || lastDay.getTime() === yesterday.getTime()) {
            currentStreak = tempStreak;
        } else {
            currentStreak = 0;
        }

        return {
            currentStreak,
            longestStreak,
            totalActiveDays: daysArray.length,
            streakHistory: daysArray.slice(-30) // Últimos 30 dias
        };
    }

    /**
     * Questões problemáticas (mais erros)
     */
    getProblemQuestions(userId) {
        const userData = window.Storage.loadUserData(userId);
        const problemQuestions = [];

        Object.entries(userData.progress).forEach(([moduleId, moduleProgress]) => {
            Object.entries(moduleProgress).forEach(([questionId, questionProgress]) => {
                if (questionProgress.incorrect > questionProgress.correct && questionProgress.seen >= 2) {
                    const questionIndex = parseInt(questionId.split('_').pop());

                    problemQuestions.push({
                        moduleId,
                        moduleName: this.getModuleName(moduleId),
                        questionIndex,
                        seen: questionProgress.seen,
                        correct: questionProgress.correct,
                        incorrect: questionProgress.incorrect,
                        errorRate: Math.round((questionProgress.incorrect / questionProgress.seen) * 100)
                    });
                }
            });
        });

        // Ordenar por taxa de erro
        problemQuestions.sort((a, b) => b.errorRate - a.errorRate);

        return problemQuestions.slice(0, 10); // Top 10 questões problemáticas
    }

    /**
     * Performance por tipo de questão
     */
    async getPerformanceByType(userId) {
        const userData = window.Storage.loadUserData(userId);
        const typeStats = {
            conteudista: { correct: 0, incorrect: 0, total: 0 },
            raciocinio: { correct: 0, incorrect: 0, total: 0 }
        };

        // Percorrer progresso e buscar tipo de questão
        for (const [moduleId, moduleProgress] of Object.entries(userData.progress)) {
            // Carregar questões do módulo
            const result = await window.API.loadModuleQuestions(moduleId);

            if (result.success) {
                const questions = result.questions;

                Object.entries(moduleProgress).forEach(([questionId, questionProgress]) => {
                    const questionIndex = parseInt(questionId.split('_').pop());
                    const question = questions[questionIndex];

                    if (question && question.type) {
                        const type = question.type === 'raciocínio' ? 'raciocinio' : 'conteudista';
                        typeStats[type].correct += questionProgress.correct;
                        typeStats[type].incorrect += questionProgress.incorrect;
                        typeStats[type].total += questionProgress.seen;
                    }
                });
            }
        }

        // Calcular percentagens
        Object.values(typeStats).forEach(stats => {
            const totalAnswers = stats.correct + stats.incorrect;
            stats.accuracy = totalAnswers > 0
                ? Math.round((stats.correct / totalAnswers) * 100)
                : 0;
        });

        return typeStats;
    }

    /**
     * Conquistas (achievements)
     */
    getAchievements(userId) {
        const userData = window.Storage.loadUserData(userId);
        const stats = userData.statistics;
        const overview = this.getOverview(userId);
        const streaks = this.getStreaks(userId);

        const achievements = [];

        // Conquistas de quantidade
        const questionMilestones = [10, 50, 100, 250, 500, 1000, 2500];
        questionMilestones.forEach(milestone => {
            if (stats.totalQuestions >= milestone) {
                achievements.push({
                    id: `questions_${milestone}`,
                    name: `${milestone} Questões`,
                    description: `Respondeu ${milestone} questões`,
                    icon: '📚',
                    unlockedAt: stats.lastActivity
                });
            }
        });

        // Conquistas de precisão
        if (overview.accuracy >= 90 && overview.totalQuestions >= 50) {
            achievements.push({
                id: 'accuracy_90',
                name: 'Mestre',
                description: '90% de acerto com 50+ questões',
                icon: '🏆',
                unlockedAt: stats.lastActivity
            });
        }

        if (overview.accuracy >= 80 && overview.totalQuestions >= 100) {
            achievements.push({
                id: 'accuracy_80',
                name: 'Expert',
                description: '80% de acerto com 100+ questões',
                icon: '⭐',
                unlockedAt: stats.lastActivity
            });
        }

        // Conquistas de streak
        if (streaks.currentStreak >= 7) {
            achievements.push({
                id: 'streak_7',
                name: 'Semana Completa',
                description: '7 dias consecutivos estudando',
                icon: '🔥',
                unlockedAt: stats.lastActivity
            });
        }

        if (streaks.currentStreak >= 30) {
            achievements.push({
                id: 'streak_30',
                name: 'Mês Dedicado',
                description: '30 dias consecutivos estudando',
                icon: '💎',
                unlockedAt: stats.lastActivity
            });
        }

        // Conquistas de tempo
        const totalHours = Math.floor(stats.totalTime / 3600);
        if (totalHours >= 10) {
            achievements.push({
                id: 'time_10h',
                name: 'Dedicação',
                description: '10 horas de estudo',
                icon: '⏱️',
                unlockedAt: stats.lastActivity
            });
        }

        if (totalHours >= 50) {
            achievements.push({
                id: 'time_50h',
                name: 'Comprometimento',
                description: '50 horas de estudo',
                icon: '📖',
                unlockedAt: stats.lastActivity
            });
        }

        return achievements.sort((a, b) =>
            new Date(b.unlockedAt) - new Date(a.unlockedAt)
        );
    }

    /**
     * Gerar dados para gráfico de evolução
     */
    getEvolutionChartData(userId, days = 30) {
        const userData = window.Storage.loadUserData(userId);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const sessions = userData.sessions.filter(session =>
            new Date(session.completedAt) >= startDate
        );

        // Agrupar por data
        const dailyScores = {};
        sessions.forEach(session => {
            const dateKey = session.completedAt.split('T')[0];

            if (!dailyScores[dateKey]) {
                dailyScores[dateKey] = {
                    date: dateKey,
                    scores: [],
                    totalQuestions: 0
                };
            }

            dailyScores[dateKey].scores.push(session.score);
            dailyScores[dateKey].totalQuestions += session.totalQuestions;
        });

        // Calcular médias diárias
        const chartData = Object.values(dailyScores).map(day => ({
            date: day.date,
            averageScore: Math.round(
                day.scores.reduce((sum, s) => sum + s, 0) / day.scores.length
            ),
            sessions: day.scores.length,
            questions: day.totalQuestions
        }));

        return chartData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Helper: Obter nome do módulo
     */
    getModuleName(moduleId) {
        for (const specialty of Object.values(quizConfig.specialties)) {
            if (specialty.hasSubcategories && specialty.subcategories) {
                for (const subcategory of Object.values(specialty.subcategories)) {
                    const module = subcategory.modules?.find(m => m.id === moduleId);
                    if (module) return module.name;
                }
            } else if (specialty.modules) {
                const module = specialty.modules.find(m => m.id === moduleId);
                if (module) return module.name;
            }
        }
        return moduleId;
    }

    /**
     * Exportar estatísticas (para compartilhamento)
     */
    exportStatistics(userId) {
        const dashboard = this.getDashboard(userId);

        return {
            userId,
            generatedAt: new Date().toISOString(),
            ...dashboard
        };
    }
}

// Singleton
const statistics = new StatisticsManager();

// Exportar para uso global
window.Statistics = statistics;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = statistics;
}
