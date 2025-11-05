/**
 * Auth.js - Sistema de Autenticação
 *
 * Versão atual: LocalStorage (desenvolvimento)
 * Versão futura: Firebase Authentication (produção)
 *
 * Estrutura preparada para migração fácil para Firebase
 */

class AuthManager {
    constructor() {
        this.useFirebase = true; // Firebase ativado! Configure em js/firebase-config.js
        this.currentUser = null;
    }

    /**
     * Inicializar autenticação
     */
    async init() {
        if (this.useFirebase) {
            return this.initFirebase();
        } else {
            return this.initLocalStorage();
        }
    }

    /**
     * Inicializar modo localStorage
     */
    initLocalStorage() {
        const userId = window.Storage.getCurrentUser();

        if (userId) {
            const users = window.Storage.getUsersList();
            const user = users.find(u => u.id === userId);

            if (user) {
                this.currentUser = user;
                window.AppState.login(user);
                return { success: true, user };
            }
        }

        return { success: false, user: null };
    }

    /**
     * Inicializar Firebase
     */
    async initFirebase() {
        if (!window.firebaseAuth) {
            console.error('Firebase Auth não disponível. Configure firebase-config.js');
            return { success: false };
        }

        return new Promise((resolve) => {
            window.firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser) {
                    // Usuário autenticado
                    const user = {
                        id: firebaseUser.uid,
                        username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                        email: firebaseUser.email
                    };

                    this.currentUser = user;
                    window.AppState.login(user);

                    console.log('✓ Sessão Firebase restaurada:', user.username);
                    resolve({ success: true, user });
                } else {
                    resolve({ success: false, user: null });
                }
            });
        });
    }

    /**
     * Registrar novo usuário
     */
    async register(userData) {
        const { username, email, password } = userData;

        // Validações
        const validation = this.validateRegistration(username, email, password);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        if (this.useFirebase) {
            return this.registerFirebase(userData);
        } else {
            return this.registerLocalStorage(userData);
        }
    }

    /**
     * Registrar usuário no localStorage
     */
    registerLocalStorage(userData) {
        const { username, email, password } = userData;

        // Verificar se email já existe
        const existingUser = window.Storage.findUserByEmail(email);
        if (existingUser) {
            return {
                success: false,
                error: 'Email já cadastrado'
            };
        }

        // Criar novo usuário
        const userId = this.generateUserId();
        const user = {
            id: userId,
            username: username.trim(),
            email: email.toLowerCase().trim(),
            passwordHash: this.hashPassword(password), // Simples hash (não seguro para produção)
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        // Salvar na lista de usuários
        window.Storage.saveUserToList(user);

        // Criar estrutura de dados do usuário
        window.Storage.createEmptyUserData(userId);

        // Login automático após registro
        return this.login({ email, password });
    }

    /**
     * Registrar usuário no Firebase
     */
    async registerFirebase(userData) {
        const { username, email, password } = userData;

        try {
            // Criar usuário no Firebase Auth
            const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;

            // Atualizar profile com nome
            await firebaseUser.updateProfile({
                displayName: username
            });

            // Criar documento do usuário no Firestore
            await window.firebaseDb.collection('users').doc(firebaseUser.uid).set({
                username: username,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Criar estrutura de progresso vazia
            await window.firebaseDb.collection('users').doc(firebaseUser.uid).collection('progress').doc('_init').set({
                initialized: true
            });

            const user = {
                id: firebaseUser.uid,
                username: username,
                email: email
            };

            this.currentUser = user;
            window.AppState.login(user);

            console.log('✓ Usuário registrado no Firebase:', username);

            return {
                success: true,
                user: user
            };

        } catch (error) {
            console.error('Erro ao registrar no Firebase:', error);

            let errorMessage = 'Erro ao criar conta';

            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email já cadastrado';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Senha muito fraca (mínimo 6 caracteres)';
                    break;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Login de usuário
     */
    async login(credentials) {
        const { email, password } = credentials;

        if (this.useFirebase) {
            return this.loginFirebase(credentials);
        } else {
            return this.loginLocalStorage(credentials);
        }
    }

    /**
     * Login no localStorage
     */
    loginLocalStorage(credentials) {
        const { email, password } = credentials;

        // Buscar usuário
        const user = window.Storage.findUserByEmail(email);

        if (!user) {
            return {
                success: false,
                error: 'Email não encontrado'
            };
        }

        // Verificar senha
        const passwordHash = this.hashPassword(password);
        if (user.passwordHash !== passwordHash) {
            return {
                success: false,
                error: 'Senha incorreta'
            };
        }

        // Atualizar último login
        user.lastLogin = new Date().toISOString();
        window.Storage.saveUserToList(user);

        // Definir usuário atual
        window.Storage.setCurrentUser(user.id);
        this.currentUser = user;

        // Atualizar estado global
        window.AppState.login(user);

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        };
    }

    /**
     * Login no Firebase
     */
    async loginFirebase(credentials) {
        const { email, password } = credentials;

        try {
            const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;

            // Atualizar último login no Firestore
            await window.firebaseDb.collection('users').doc(firebaseUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            const user = {
                id: firebaseUser.uid,
                username: firebaseUser.displayName || email.split('@')[0],
                email: firebaseUser.email
            };

            this.currentUser = user;
            window.AppState.login(user);

            console.log('✓ Login Firebase bem-sucedido:', user.username);

            return {
                success: true,
                user: user
            };

        } catch (error) {
            console.error('Erro ao fazer login no Firebase:', error);

            let errorMessage = 'Erro ao fazer login';

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Conta desativada';
                    break;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Logout
     */
    async logout() {
        if (this.useFirebase) {
            return this.logoutFirebase();
        } else {
            return this.logoutLocalStorage();
        }
    }

    /**
     * Logout do localStorage
     */
    logoutLocalStorage() {
        window.Storage.clearCurrentUser();
        this.currentUser = null;
        window.AppState.logout();

        return { success: true };
    }

    /**
     * Logout do Firebase
     */
    async logoutFirebase() {
        try {
            await window.firebaseAuth.signOut();
            this.currentUser = null;
            window.AppState.logout();

            console.log('✓ Logout Firebase bem-sucedido');

            return { success: true };

        } catch (error) {
            console.error('Erro ao fazer logout do Firebase:', error);
            return {
                success: false,
                error: 'Erro ao fazer logout'
            };
        }
    }

    /**
     * Obter usuário atual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verificar se está autenticado
     */
    isAuthenticated() {
        return this.currentUser !== null && window.AppState.get('user.isAuthenticated');
    }

    /**
     * Resetar senha (futuro)
     */
    async resetPassword(email) {
        if (this.useFirebase) {
            // TODO: firebase.auth().sendPasswordResetEmail(email)
            return { success: false, error: 'Firebase não configurado' };
        } else {
            // No localStorage, apenas simular
            const user = window.Storage.findUserByEmail(email);

            if (!user) {
                return { success: false, error: 'Email não encontrado' };
            }

            // Em produção real, enviaria email
            console.log('Reset de senha seria enviado para:', email);

            return {
                success: true,
                message: 'Em produção, um email seria enviado com instruções'
            };
        }
    }

    /**
     * Atualizar perfil do usuário
     */
    async updateProfile(updates) {
        if (!this.currentUser) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const { username } = updates;

        if (username && username.trim()) {
            this.currentUser.username = username.trim();

            // Atualizar na lista
            window.Storage.saveUserToList(this.currentUser);

            // Atualizar estado
            window.AppState.set('user.username', username.trim());

            return { success: true };
        }

        return { success: false, error: 'Nenhuma alteração fornecida' };
    }

    /**
     * Validar dados de registro
     */
    validateRegistration(username, email, password) {
        // Validar username
        if (!username || username.trim().length < 3) {
            return {
                valid: false,
                error: 'Nome deve ter pelo menos 3 caracteres'
            };
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return {
                valid: false,
                error: 'Email inválido'
            };
        }

        // Validar senha
        if (!password || password.length < 6) {
            return {
                valid: false,
                error: 'Senha deve ter pelo menos 6 caracteres'
            };
        }

        return { valid: true };
    }

    /**
     * Gerar ID único para usuário
     */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Hash simples de senha (APENAS PARA DESENVOLVIMENTO)
     * Em produção com Firebase, não precisaremos disso
     */
    hashPassword(password) {
        // ATENÇÃO: Este é um hash MUITO SIMPLES, apenas para desenvolvimento
        // Firebase cuida da segurança de senhas automaticamente
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'hash_' + Math.abs(hash).toString(36);
    }

    /**
     * Migrar para Firebase (helper para futura migração)
     */
    async migrateToFirebase() {
        console.log('=== INICIANDO MIGRAÇÃO PARA FIREBASE ===');

        const users = window.Storage.getUsersList();
        console.log(`Encontrados ${users.length} usuários para migrar`);

        // TODO: Implementar migração quando Firebase estiver configurado
        // Para cada usuário:
        // 1. Criar conta no Firebase Auth
        // 2. Migrar dados para Firestore
        // 3. Migrar imagens para Firebase Storage

        return {
            success: false,
            message: 'Migração será implementada quando Firebase estiver configurado'
        };
    }
}

// Singleton
const auth = new AuthManager();

// Exportar para uso global
window.Auth = auth;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = auth;
}
