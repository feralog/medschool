/**
 * Navigation.js - Navegação entre questões
 * Gerencia scroll de navegação, botões, auto-scroll, etc.
 */

class NavigationManager {
    constructor() {
        this.scrollOffset = 0;
        this.visibleButtonsCount = 10;
    }

    /**
     * Gerar barra de navegação
     */
    generate() {
        const questions = window.AppState.get('quiz.questions');
        const currentIndex = window.AppState.get('quiz.currentIndex');
        const states = window.AppState.get('session.states');

        const navContainer = document.getElementById('question-navigation');
        if (!navContainer) return;

        navContainer.innerHTML = '';

        questions.forEach((_, index) => {
            const button = document.createElement('button');
            button.className = 'btn btn-sm question-nav-btn';
            button.textContent = index + 1;
            button.dataset.index = index;

            // Classes de estado
            if (index === currentIndex) {
                button.classList.add('current');
            }

            if (states[index] === 'answered') {
                button.classList.add('answered');
            }

            button.addEventListener('click', () => this.navigateTo(index));
            navContainer.appendChild(button);
        });

        this.calculateVisibleButtons();
        this.updateScrollVisibility();
    }

    /**
     * Navegar para questão específica
     */
    navigateTo(index) {
        const questions = window.AppState.get('quiz.questions');

        if (index < 0 || index >= questions.length) {
            return;
        }

        window.AppState.set('quiz.currentIndex', index);
        this.autoScrollTo(index);
    }

    /**
     * Próxima questão
     */
    next() {
        const currentIndex = window.AppState.get('quiz.currentIndex');
        const questions = window.AppState.get('quiz.questions');

        if (currentIndex < questions.length - 1) {
            this.navigateTo(currentIndex + 1);
        }
    }

    /**
     * Questão anterior
     */
    previous() {
        const currentIndex = window.AppState.get('quiz.currentIndex');

        if (currentIndex > 0) {
            this.navigateTo(currentIndex - 1);
        }
    }

    /**
     * Auto-scroll para questão
     */
    autoScrollTo(index) {
        const navContainer = document.getElementById('question-navigation');
        if (!navContainer) return;

        const buttons = navContainer.querySelectorAll('.question-nav-btn');
        if (!buttons[index]) return;

        const button = buttons[index];
        const containerWidth = navContainer.offsetWidth;
        const buttonLeft = button.offsetLeft;
        const buttonWidth = button.offsetWidth;

        // Calcular scroll ideal
        const idealScroll = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);

        // Scroll suave
        navContainer.scrollTo({
            left: Math.max(0, idealScroll),
            behavior: 'smooth'
        });
    }

    /**
     * Scroll para esquerda
     */
    scrollLeft() {
        const navContainer = document.getElementById('question-navigation');
        if (!navContainer) return;

        navContainer.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
    }

    /**
     * Scroll para direita
     */
    scrollRight() {
        const navContainer = document.getElementById('question-navigation');
        if (!navContainer) return;

        navContainer.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    }

    /**
     * Calcular botões visíveis
     */
    calculateVisibleButtons() {
        const navContainer = document.getElementById('question-navigation');
        if (!navContainer) return 10;

        const containerWidth = navContainer.offsetWidth;
        const buttonWidth = 50; // Aproximado
        this.visibleButtonsCount = Math.floor(containerWidth / buttonWidth);
    }

    /**
     * Atualizar visibilidade das setas
     */
    updateScrollVisibility() {
        const navContainer = document.getElementById('question-navigation');
        const leftArrow = document.getElementById('nav-arrow-left');
        const rightArrow = document.getElementById('nav-arrow-right');

        if (!navContainer || !leftArrow || !rightArrow) return;

        const canScrollLeft = navContainer.scrollLeft > 0;
        const canScrollRight = navContainer.scrollLeft < (navContainer.scrollWidth - navContainer.offsetWidth);

        leftArrow.style.display = canScrollLeft ? 'block' : 'none';
        rightArrow.style.display = canScrollRight ? 'block' : 'none';
    }
}

const navigation = new NavigationManager();
window.Navigation = navigation;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = navigation;
}
