/**
 * firebase-config.js - Configuração do Firebase
 *
 * INSTRUÇÕES:
 * 1. Crie um projeto no Firebase Console (https://console.firebase.google.com)
 * 2. Vá em Project Settings → General → Your apps → Web app
 * 3. Copie as credenciais e cole abaixo
 * 4. Salve este arquivo
 */

// ⚠️ PREENCHA COM SUAS CREDENCIAIS DO FIREBASE
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop",
  measurementId: "G-XXXXXXXXXX"  // Opcional (Google Analytics)
};

// Verificar se as credenciais foram preenchidas
if (firebaseConfig.apiKey === "COLE_SUA_API_KEY_AQUI") {
  console.error("⚠️ FIREBASE NÃO CONFIGURADO!");
  console.error("Por favor, edite o arquivo js/firebase-config.js com suas credenciais.");
  console.error("Veja instruções em: FIREBASE_SETUP.md");
}

// Inicializar Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("✓ Firebase inicializado com sucesso");

  // Se Google Analytics foi configurado
  if (firebaseConfig.measurementId) {
    firebase.analytics();
    console.log("✓ Google Analytics ativado");
  }
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase:", error);
}

// Exportar serviços Firebase para uso global
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.firestore();
window.firebaseStorage = firebase.storage();

// Configurações do Firestore
if (window.firebaseDb) {
  // Habilitar persistência offline
  window.firebaseDb.enablePersistence()
    .then(() => {
      console.log("✓ Persistência offline ativada");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Persistência offline não disponível (múltiplas abas)');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Navegador não suporta persistência offline');
      }
    });
}

console.log("📦 firebase-config.js carregado");
