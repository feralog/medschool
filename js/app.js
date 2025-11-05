/**
 * app.js - Aplicação Principal Refatorada
 *
 * Versão 2.0 - Arquitetura Modular
 * - Usa State Management centralizado
 * - Sistema de autenticação multi-usuário
 * - Estatísticas avançadas
 * - Lazy loading de questões
 * - Salvamento de posição (continuar de onde parou)
 */

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicação...');

    // Inicializar managers
    await initializeApp();

    // Setup event listeners
    setupEventListeners();

    // Tentar restaurar sessão
    const session = await Auth.init();

    if (session.success) {
        console.log('✓ Sessão restaurada:', session.user.username);
        showSpecialtySelection();
    } else {
        console.log('→ Nenhuma sessão ativa');
        Screens.show('login');
    }

    console.log('✓ Aplicação inicializada');
});

/**
 * Inicializar aplicação
 */
async function initializeApp() {
    // Atualizar título
    document.getElementById('quiz-subject-title').textContent = quizConfig.title;
    document.title = quizConfig.title;

    // Inicializar screen manager
    Screens.init();
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    // === LOGIN & REGISTRO ===
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('show-register-btn').addEventListener('click', () => Screens.show('register'));
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('back-to-login-btn').addEventListener('click', () => Screens.show('login'));

    // === LOGOUT ===
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // === ESPECIALIDADES ===
    document.getElementById('go-specialty-btn').addEventListener('click', () => selectSpecialty('go'));
    document.getElementById('cardio-specialty-btn').addEventListener('click', () => selectSpecialty('cardio'));
    document.getElementById('tc-specialty-btn').addEventListener('click', () => selectSpecialty('tc'));
    document.getElementById('clinica-specialty-btn').addEventListener('click', () => selectSpecialty('clinica'));

    // === ESTATÍSTICAS ===
    document.getElementById('view-statistics-btn').addEventListener('click', showStatistics);
    document.getElementById('stats-back-btn')?.addEventListener('click', showSpecialtySelection);

    // === NAVEGAÇÃO (delegadas para o sistema antigo por enquanto) ===
    // Esses listeners serão gradualmente migrados para os novos módulos
}

// =============================================================================
// AUTENTICAÇÃO
// =============================================================================

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const result = await Auth.login({ email, password });

    if (result.success) {
        console.log('✓ Login bem-sucedido:', result.user.username);
        showSpecialtySelection();
    } else {
        alert('Erro: ' + result.error);
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    // Validar senhas
    if (password !== passwordConfirm) {
        alert('As senhas não coincidem');
        return;
    }

    const result = await Auth.register({ username, email, password });

    if (result.success) {
        console.log('✓ Registro bem-sucedido:', result.user.username);
        showSpecialtySelection();
    } else {
        alert('Erro: ' + result.error);
    }
}

async function handleLogout() {
    const confirmed = confirm('Deseja realmente sair?');
    if (!confirmed) return;

    await Auth.logout();
    Screens.show('login');

    // Limpar formulários
    document.getElementById('login-form').reset();
}

// =============================================================================
// NAVEGAÇÃO DE TELAS
// =============================================================================

function showSpecialtySelection() {
    Screens.show('specialty');

    // Atualizar nome do usuário se houver
    const username = AppState.get('user.username');
    if (username) {
        const titleElement = document.querySelector('.specialty-header h2');
        if (titleElement) {
            titleElement.innerHTML = `Bem-vindo, <strong>${username}</strong>!<br><small>Selecione a Especialidade</small>`;
        }
    }
}

function selectSpecialty(specialtyId) {
    const specialty = quizConfig.specialties[specialtyId];
    if (!specialty) {
        console.error('Especialidade não encontrada:', specialtyId);
        return;
    }

    AppState.set('selection.specialty', specialtyId);

    // Se tem subcategorias, mostrar tela de subcategorias
    if (specialty.hasSubcategories) {
        showSubcategorySelection(specialty);
    } else {
        // Ir direto para módulos
        showModuleSelection(specialty, null);
    }
}

function showSubcategorySelection(specialty) {
    Screens.show('subcategory');

    const titleElement = document.getElementById('subcategory-specialty-title');
    if (titleElement) {
        titleElement.textContent = specialty.name;
    }

    const container = document.getElementById('subcategory-buttons-container');
    if (!container) return;

    container.innerHTML = '';

    Object.entries(specialty.subcategories).forEach(([subcatId, subcategory]) => {
        const button = document.createElement('button');
        button.className = 'specialty-card btn-outline-primary';
        button.innerHTML = `
            <i class="fas fa-folder"></i>
            <div class="specialty-card-content">
                <strong>${subcategory.name}</strong>
                <small class="text-muted">${subcategory.modules.length} módulos</small>
            </div>
        `;
        button.addEventListener('click', () => {
            AppState.set('selection.subcategory', subcatId);
            showModuleSelection(specialty, subcatId);
        });
        container.appendChild(button);
    });
}

function showModuleSelection(specialty, subcategoryId) {
    // NOTA: Esta função ainda usa o sistema antigo de data.js
    // Será migrada gradualmente para usar API.js

    // Por enquanto, delegar para função antiga se existir
    if (typeof showModuleSelectionScreen === 'function') {
        showModuleSelectionScreen();
    } else {
        console.warn('showModuleSelectionScreen() não encontrada - migrando...');
        // TODO: Implementar versão moderna aqui
    }
}

// =============================================================================
// ESTATÍSTICAS
// =============================================================================

function showStatistics() {
    const userId = AppState.get('user.id');
    if (!userId) {
        alert('Você precisa estar logado para ver estatísticas');
        return;
    }

    Screens.show('statistics');

    // Obter dashboard completo
    const dashboard = Statistics.getDashboard(userId);

    // Atualizar cards de overview
    updateStatisticsOverview(dashboard.overview);

    // Atualizar gráfico de evolução
    updateEvolutionChart(userId);

    // Atualizar conquistas
    updateAchievements(dashboard.achievements);

    // Atualizar tabela de módulos
    updateModuleStats(dashboard.moduleBreakdown);

    // Atualizar questões problemáticas
    updateProblemQuestions(dashboard.problemQuestions);
}

function updateStatisticsOverview(overview) {
    document.getElementById('stat-total-questions').textContent = overview.totalQuestions;
    document.getElementById('stat-correct').textContent = overview.totalCorrect;
    document.getElementById('stat-accuracy').textContent = `${overview.accuracy}% de precisão`;
    document.getElementById('stat-total-time').textContent = `${overview.totalTimeMinutes}h`;
    document.getElementById('stat-current-streak').textContent = overview.currentStreak;
}

function updateEvolutionChart(userId) {
    const chartData = Statistics.getEvolutionChartData(userId, 7);
    const canvas = document.getElementById('evolution-chart');

    if (!canvas) return;

    // Destruir gráfico anterior se existir
    if (window.evolutionChart) {
        window.evolutionChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    window.evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }),
            datasets: [{
                label: 'Score Médio',
                data: chartData.map(d => d.averageScore),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function updateAchievements(achievements) {
    const container = document.getElementById('achievements-container');
    if (!container) return;

    if (achievements.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nenhuma conquista ainda. Continue estudando!</p>';
        return;
    }

    container.innerHTML = achievements.map(achievement => `
        <div class="d-flex align-items-center mb-3 p-2 bg-light rounded">
            <div class="fs-1 me-3">${achievement.icon}</div>
            <div>
                <strong>${achievement.name}</strong><br>
                <small class="text-muted">${achievement.description}</small>
            </div>
        </div>
    `).join('');
}

function updateModuleStats(moduleBreakdown) {
    const tbody = document.getElementById('module-stats-table');
    if (!tbody) return;

    if (moduleBreakdown.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhum módulo iniciado ainda</td></tr>';
        return;
    }

    tbody.innerHTML = moduleBreakdown.map(stats => `
        <tr>
            <td>${stats.moduleName}</td>
            <td>${stats.sessions}</td>
            <td>${stats.totalQuestions}</td>
            <td>${stats.correctCount}</td>
            <td><span class="badge bg-${stats.averageScore >= 70 ? 'success' : 'warning'}">${stats.averageScore}%</span></td>
            <td><span class="badge bg-primary">${stats.bestScore}%</span></td>
        </tr>
    `).join('');
}

function updateProblemQuestions(problemQuestions) {
    const container = document.getElementById('problem-questions-container');
    if (!container) return;

    if (problemQuestions.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Nenhuma questão problemática identificada</p>';
        return;
    }

    container.innerHTML = '<div class="list-group">' +
        problemQuestions.map((q, index) => `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>#${index + 1} - ${q.moduleName}</strong><br>
                        <small class="text-muted">Questão ${q.questionIndex + 1}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-danger">${q.errorRate}% de erros</span><br>
                        <small class="text-muted">${q.correct}/${q.seen} acertos</small>
                    </div>
                </div>
            </div>
        `).join('') +
        '</div>';
}

// =============================================================================
// INTEGRAÇÃO COM SISTEMA ANTIGO
// =============================================================================

/**
 * NOTA IMPORTANTE:
 *
 * As funções abaixo ainda dependem do sistema antigo (app.old.js e data.js)
 * para funcionalidades como:
 * - Seleção de módulos
 * - Quiz flow
 * - Navegação entre questões
 * - Markdown rendering
 *
 * Estas serão gradualmente migradas para usar os novos módulos:
 * - API.js para carregamento de questões
 * - Quiz.js para lógica do quiz
 * - Navigation.js para navegação
 * - marked.js para markdown
 *
 * Por enquanto, vamos manter compatibilidade com o código antigo.
 */

// Exportar funções para compatibilidade com código antigo
window.showSpecialtySelection = showSpecialtySelection;
window.selectSpecialty = selectSpecialty;

console.log('📦 app.js v2.0 carregado - Arquitetura modular');
