# 🔥 FIREBASE SETUP - Guia Passo a Passo

## 📋 Checklist Geral

- [ ] Projeto Firebase criado
- [ ] Firebase Authentication configurado
- [ ] Firestore Database configurado
- [ ] Firebase Storage configurado
- [ ] Credenciais obtidas
- [ ] Regras de segurança configuradas
- [ ] Código atualizado com credenciais
- [ ] Deploy realizado

---

## PASSO 1: CRIAR PROJETO FIREBASE

### 1.1 Acessar Console
- URL: https://console.firebase.google.com
- Login com conta Google

### 1.2 Criar Projeto
1. Clique em **"Add project"** / **"Adicionar projeto"**
2. Nome do projeto: `quiz-medico` (ou seu preferido)
3. ID do projeto: será gerado automaticamente (ex: `quiz-medico-abc123`)
4. ✅ Habilitar Google Analytics (recomendado)
5. Escolher conta Analytics ou criar nova
6. Aguardar criação (~30 segundos)

---

## PASSO 2: CONFIGURAR AUTHENTICATION

### 2.1 Ativar Authentication
1. No menu lateral, clique em **"Build" → "Authentication"**
2. Clique em **"Get started"**
3. Vá para aba **"Sign-in method"**

### 2.2 Habilitar Email/Password
1. Clique em **"Email/Password"**
2. ✅ Ativar primeiro toggle (Email/Password)
3. ❌ Deixar segundo toggle desativado (Email link - passwordless)
4. Clique em **"Save"**

### 2.3 Habilitar Google Sign-In (OPCIONAL)
1. Clique em **"Google"**
2. ✅ Ativar
3. Escolher email de suporte do projeto
4. Clique em **"Save"**

**✅ CHECKPOINT:** Authentication configurado!

---

## PASSO 3: CONFIGURAR FIRESTORE

### 3.1 Criar Database
1. No menu lateral, clique em **"Build" → "Firestore Database"**
2. Clique em **"Create database"**

### 3.2 Escolher Modo
- Selecione: **"Start in test mode"** (por enquanto)
- ⚠️ Vamos configurar regras de segurança depois!
- Clique em **"Next"**

### 3.3 Escolher Localização
- Recomendado: `southamerica-east1` (São Paulo, Brasil)
- Ou: `us-central1` (se preferir EUA)
- Clique em **"Enable"**
- Aguardar criação (~1 minuto)

### 3.4 Estrutura de Coleções

Vamos criar estas coleções (depois via script):

```
firestore/
├── specialties/           # Especialidades
│   └── {specialtyId}/
│       ├── modules/       # Módulos
│       │   └── {moduleId}/
│       │       └── questions/  # Questões
├── users/                 # Usuários
│   └── {userId}/
│       ├── profile        # Perfil
│       ├── progress/      # Progresso
│       └── sessions/      # Sessões
└── stats/                 # Estatísticas globais
```

**✅ CHECKPOINT:** Firestore configurado!

---

## PASSO 4: CONFIGURAR STORAGE

### 4.1 Ativar Storage
1. No menu lateral, clique em **"Build" → "Storage"**
2. Clique em **"Get started"**
3. Selecione **"Start in test mode"** (por enquanto)
4. Clique em **"Next"**

### 4.2 Escolher Localização
- Use a MESMA localização do Firestore
- Ex: `southamerica-east1`
- Clique em **"Done"**

### 4.3 Estrutura de Pastas

Vamos organizar assim:

```
storage/
├── questions/
│   ├── GO/
│   │   └── images/
│   ├── CardioPneumo/
│   │   └── images/
│   └── ...
└── users/
    └── {userId}/
        └── uploads/  # Para futuro (fotos de perfil, etc)
```

**✅ CHECKPOINT:** Storage configurado!

---

## PASSO 5: OBTER CREDENCIAIS

### 5.1 Adicionar App Web
1. No overview do projeto, clique no ícone **"</>"** (Web)
2. Nome do app: `Quiz Medico Web`
3. ✅ Marcar **"Also set up Firebase Hosting"**
4. Clique em **"Register app"**

### 5.2 Copiar Configuração

Você verá algo assim:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "quiz-medico.firebaseapp.com",
  projectId: "quiz-medico",
  storageBucket: "quiz-medico.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

**🔐 COPIE ISSO!** Você vai colar no arquivo `js/firebase-config.js`

### 5.3 Instalar Firebase CLI (para deploy)

No terminal:

```bash
npm install -g firebase-tools
```

Ou se não tiver npm:

```bash
curl -sL https://firebase.tools | bash
```

### 5.4 Fazer Login

```bash
firebase login
```

Isso abrirá o navegador para você fazer login.

**✅ CHECKPOINT:** Credenciais obtidas!

---

## PASSO 6: CONFIGURAR REGRAS DE SEGURANÇA

### 6.1 Firestore Rules

No console Firebase:
1. **Firestore Database** → **Rules**
2. Cole as regras abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Especialidades e questões: leitura pública, escrita apenas admin
    match /specialties/{specialty} {
      allow read: if true;  // Todos podem ler
      allow write: if false; // Apenas via Admin SDK

      match /modules/{module}/questions/{question} {
        allow read: if true;
        allow write: if false;
      }
    }

    // Usuários: apenas o próprio usuário pode ler/escrever
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /progress/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /sessions/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Estatísticas globais: leitura autenticada
    match /stats/{document=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

3. Clique em **"Publish"**

### 6.2 Storage Rules

No console Firebase:
1. **Storage** → **Rules**
2. Cole as regras abaixo:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Imagens de questões: leitura pública
    match /questions/{specialty}/{allPaths=**} {
      allow read: if true;
      allow write: if false;  // Apenas via Admin SDK
    }

    // Arquivos de usuários: apenas o próprio usuário
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Clique em **"Publish"**

**✅ CHECKPOINT:** Segurança configurada!

---

## PASSO 7: PREENCHER ARQUIVO DE CONFIG

1. **Abra o arquivo:** `js/firebase-config.js`
2. **Cole suas credenciais** do Passo 5.2
3. **Salve o arquivo**

Exemplo:

```javascript
// js/firebase-config.js
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef",
  measurementId: "G-XXXXXXXXXX"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar serviços
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
```

**✅ CHECKPOINT:** Config preenchida!

---

## PASSO 8: TESTAR LOCALMENTE

1. **Abra `index.html`** no navegador
2. **Abra o Console** (F12)
3. Verifique se não há erros de Firebase
4. Tente criar uma conta
5. Verifique no Firebase Console se o usuário foi criado:
   - **Authentication** → **Users** → Deve aparecer o usuário

**✅ CHECKPOINT:** Firebase funcionando localmente!

---

## PASSO 9: MIGRAR DADOS

Execute o script de migração:

```bash
# No terminal, na pasta do projeto
node scripts/migrate-to-firebase.js
```

Isso vai:
- ✅ Criar coleções no Firestore
- ✅ Migrar todas as questões dos JSONs
- ✅ Upload de todas as imagens para Storage
- ✅ Atualizar referências

**⏱️ Tempo estimado:** 5-10 minutos

**✅ CHECKPOINT:** Dados migrados!

---

## PASSO 10: DEPLOY

### 10.1 Inicializar Firebase Hosting

```bash
firebase init hosting
```

Responda:
- **Project:** Selecione seu projeto
- **Public directory:** `.` (raiz do projeto)
- **Single-page app:** `Yes`
- **GitHub deployment:** `No` (por enquanto)
- **Overwrite index.html:** `No`

### 10.2 Criar arquivo firebase.json

Será criado automaticamente. Verifique se está assim:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "scripts/**",
      "*.md"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 10.3 Deploy!

```bash
firebase deploy --only hosting
```

Aguarde o deploy (~1 minuto).

Você receberá a URL:
```
Hosting URL: https://quiz-medico.web.app
```

**🎉 PRONTO!** Seu app está no ar!

**✅ CHECKPOINT:** Deploy realizado!

---

## 📱 DOMÍNIO CUSTOMIZADO (OPCIONAL)

Se quiser usar seu próprio domínio:

1. **No Firebase Console:**
   - **Hosting** → **Add custom domain**

2. **Digite seu domínio:**
   - Ex: `quizmedico.com`

3. **Verificar propriedade:**
   - Adicionar registro TXT no DNS

4. **Configurar DNS:**
   - Adicionar registros A apontando para Firebase

Firebase fornece **SSL grátis** automaticamente!

---

## 🐛 TROUBLESHOOTING

### Erro: "Firebase not defined"
- ✅ Verifique se adicionou os scripts Firebase no `index.html`
- ✅ Ordem: Firebase SDK → Firebase Config → Seus módulos

### Erro: "Permission denied"
- ✅ Verifique regras de segurança no console
- ✅ Certifique-se de estar autenticado

### Erro: "Quota exceeded"
- ✅ Verifique limites do Free Tier
- ✅ Considere upgrade para Blaze plan

### Deploy falha
- ✅ Rode `firebase login` novamente
- ✅ Verifique se `.firebaserc` aponta para projeto correto

---

## 📊 LIMITES FREE TIER

Firebase Spark Plan (Grátis):

| Recurso | Limite |
|---------|--------|
| **Firestore Reads** | 50K/dia |
| **Firestore Writes** | 20K/dia |
| **Storage** | 5GB |
| **Hosting** | 10GB/mês |
| **Auth Users** | Ilimitado ✅ |

**Para ~100 usuários ativos/dia:** 100% grátis
**Para ~1000 usuários ativos/dia:** Considere Blaze plan ($25-50/mês)

---

## ✅ CHECKLIST FINAL

Antes de considerar concluído:

- [ ] Projeto Firebase criado
- [ ] Authentication funcionando (email/senha)
- [ ] Firestore com regras de segurança
- [ ] Storage configurado
- [ ] Dados migrados com sucesso
- [ ] Imagens fazendo upload
- [ ] App funcionando localmente com Firebase
- [ ] Deploy realizado com sucesso
- [ ] App acessível publicamente
- [ ] Usuários conseguem criar conta
- [ ] Questões carregam do Firestore
- [ ] Progresso salva no Firestore
- [ ] Estatísticas funcionando

---

## 📞 PRÓXIMOS PASSOS

Depois de tudo configurado:

1. **Testar extensivamente**
2. **Compartilhar URL com beta testers**
3. **Monitorar uso no Firebase Console**
4. **Considerar ETAPA 3 (PWA)**
5. **Ou ETAPA 4 (Mobile App)**

---

**Última atualização:** 2025-11-05
**Status:** Guia completo para configuração Firebase
