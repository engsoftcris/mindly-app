# Sprint Retrospective - Mindly App 🧠

**Sprint:** TAL-48 (Profile & Social Core)
**Data:** Março de 2026

---

## 🟢 1. O que funcionou bem? (Keep Doing)
- **Sincronia Frontend/Backend**: Apesar da refatoração pesada (UUIDs e troca de ID por UUID), conseguimos alinhar as duas pontas.
- **Cobertura de Testes**: Manter a disciplina de rodar Pytest e Cypress salvou o projeto de vários "quebras" silenciosas durante a mudança dos modelos.
- **CI/CD Resiliente**: O esforço para deixar o Pipeline do GitHub verde garantiu que o código está realmente pronto para deploy, sem "funciona na minha máquina".
- **Evolução Visual**: O site atingiu um nível de maturidade visual muito alto, com UX intuitiva para fluxos complexos como o bloqueio.

## 🔴 2. O que não funcionou tão bem? (Less Of)
- **Escopo Volátil**: Tentamos resolver pequenos bugs de interface (Notificações/Privacidade) no fim da sprint, o que gerou risco de quebrar o que já estava estável.
- **Configuração de Rotas**: A falta de uma rota `/feed` explícita no React causou confusão temporária nos testes do Cypress, que esperavam um redirecionamento que o `App.js` não fazia.
- **Debug de Estado**: Gastamos tempo considerável debugando por que campos (is_private) não salvavam, o que aponta para a necessidade de logs mais claros no Serializer.

## 🟡 3. Lições Aprendidas (Aha! Moments)
- **ID Normalization**: Criar um helper `getId()` foi a chave para resolver 90% dos problemas de "quem é o dono deste perfil".
- **Cypress no GitHub Actions**: Aprendemos que o ambiente de CI é mais lento e exige timeouts maiores (15s+) e asserções de URL menos rígidas (Regex/Match).
- **Separar User de Profile**: Essa decisão arquitetural foi dolorosa de implementar agora, mas evitou uma dívida técnica gigante no futuro.

---

## 🚀 4. Plano de Ação para a Próxima Sprint (Going Forward)
- **Foco Cirúrgico**: Resolver o bug de persistência do `is_private` logo no dia 01 da próxima sprint.
- **Refatoração do Contador**: Criar um `useEffect` na página de notificações para disparar o `mark_as_read` assim que o componente montar.
- **Documentação de Rotas**: Manter um comentário ou doc simples com as rotas reais do `App.js
