/**
 * Quiz.js - Lógica do Quiz
 * Gerencia sessão de quiz, respostas, timer, etc.
 */

class QuizManager {
    constructor() {
        this.timerInterval = null;
    }

    /**
     * Iniciar quiz
     */
    async start(moduleId, mode = 'quiz') {
        // Carregar questões do módulo (lazy loading)
        const result = await window.API.loadModuleQuestions(moduleId);

        if (!result.success) {
            alert(`Erro ao carregar módulo: ${result.error}`);
            return false;
        }

        // Verificar se usuário quer continuar de onde parou
        const userId = window.AppState.get('user.id');
        const position = window.Storage.getModulePosition(userId, moduleId);

        let startIndex = 0;
        if (position.hasPosition && position.questionIndex > 0) {
            const shouldContinue = confirm(
                `Você parou na questão ${position.questionIndex + 1}. Deseja continuar de onde parou?`
            );
            if (shouldContinue) {
                startIndex = position.questionIndex;
            }
        }

        // Configurar estado
        window.AppState.update({
            'selection.module': moduleId,
            'quiz.mode': mode,
            'quiz.questions': result.questions,
            'quiz.currentIndex': startIndex,
            'quiz.startTime': Date.now(),
            'quiz.elapsedSeconds': 0
        });

        // Resetar sessão
        window.AppState.resetQuizSession();
        window.AppState.set('quiz.currentIndex', startIndex);

        // Iniciar timer
        this.startTimer();

        return true;
    }

    /**
     * Responder questão
     */
    answer(questionIndex, selectedOption, isCorrect) {
        const userId = window.AppState.get('user.id');
        const moduleId = window.AppState.get('selection.module');
        const mode = window.AppState.get('quiz.mode');

        // Salvar resposta na sessão
        const answers = window.AppState.get('session.answers');
        answers[questionIndex] = selectedOption;
        window.AppState.set('session.answers', answers);

        // Atualizar estados
        const states = window.AppState.get('session.states');
        states[questionIndex] = 'answered';
        window.AppState.set('session.states', states);

        // Modo mentor: marcar como confirmado
        if (mode === 'mentor') {
            const confirmed = window.AppState.get('session.confirmed');
            confirmed[questionIndex] = true;
            window.AppState.set('session.confirmed', confirmed);
        }

        // Salvar progresso
        window.API.saveProgress(userId, moduleId, questionIndex, isCorrect);

        // Salvar posição
        window.Storage.saveModulePosition(userId, moduleId, questionIndex);
    }

    /**
     * Finalizar quiz
     */
    async finish() {
        this.stopTimer();

        const userId = window.AppState.get('user.id');
        const moduleId = window.AppState.get('selection.module');
        const mode = window.AppState.get('quiz.mode');
        const answers = window.AppState.get('session.answers');
        const questions = window.AppState.get('quiz.questions');
        const startTime = window.AppState.get('quiz.startTime');

        // Calcular resultados
        let correctCount = 0;
        let incorrectCount = 0;

        questions.forEach((question, index) => {
            if (answers[index] !== undefined) {
                if (answers[index] === question.correctIndex) {
                    correctCount++;
                } else {
                    incorrectCount++;
                }
            }
        });

        const timeSpent = Math.floor((Date.now() - startTime) / 1000);

        // Salvar sessão
        await window.API.saveQuizSession(userId, {
            moduleId,
            mode,
            correctCount,
            incorrectCount,
            totalQuestions: questions.length,
            timeSpent
        });

        // Atualizar estado
        window.AppState.update({
            'session.correctCount': correctCount,
            'session.incorrectCount': incorrectCount
        });

        // Resetar posição salva
        window.Storage.saveModulePosition(userId, moduleId, 0);

        return {
            correctCount,
            incorrectCount,
            totalQuestions: questions.length,
            timeSpent,
            score: Math.round((correctCount / questions.length) * 100)
        };
    }

    /**
     * Iniciar timer
     */
    startTimer() {
        this.stopTimer(); // Limpar timer anterior

        this.timerInterval = setInterval(() => {
            const elapsed = window.AppState.get('quiz.elapsedSeconds');
            window.AppState.set('quiz.elapsedSeconds', elapsed + 1);
        }, 1000);

        window.AppState.set('quiz.timerInterval', this.timerInterval);
    }

    /**
     * Parar timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Formatar tempo
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

const quiz = new QuizManager();
window.Quiz = quiz;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = quiz;
}
