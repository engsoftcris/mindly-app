# Sprint Retrospective: CI/CD & Test Alignment

**Project:** Mindly App  
**Date:** February 13, 2026  
**Sprint Status:** CLOSED 🏁  

---

## 📝 Executive Summary
Nesta sprint, focamos na estabilidade do ambiente de testes e na automação do deploy. Superamos desafios técnicos relacionados a seletores de interface e configuramos uma pipeline de CI/CD profissional que garante a integridade da branch `main`.

---

## 🔄 Start, Stop & Keep Doing

### 🟢 START DOING (Começar a fazer)
* **Specific Test Selectors:** Implementar atributos `data-cy` no React para desacoplar os testes das classes de estilo.
* **Pre-commit Inspection:** Validar o `git status` rigorosamente para evitar a inclusão de arquivos binários (`/media`) indesejados.
* **Secret Management Documentation:** Manter uma lista de quais `Secrets` são necessários no GitHub Actions para que o ambiente possa ser replicado facilmente.

### 🔴 STOP DOING (Parar de fazer)
* **Hardcoding Environment Data:** Nunca mais inserir URLs de deploy ou credenciais diretamente no código-fonte ou arquivos `.yml`.
* **Fixing on Main:** Cessar qualquer tentativa de correção direta na branch de produção. O fluxo agora é obrigatoriamente via Feature Branch.
* **Ignoring Linting/Warnings:** Tratar avisos de console e falhas de ambiente (como o Google SDK) proativamente no código de teste.

### 🔵 KEEP DOING (Continuar fazendo)
* **Multi-branch Pipelines:** Manter a execução de testes em todas as branches de feature para detectar erros precocemente (*Fail Fast*).
* **Semantic Commits (Jira):** Continuar o padrão `TAL-XX: message` para garantir 100% de rastreabilidade entre código e tarefas.
* **API Mocking:** Utilizar o `cy.intercept` para garantir que o frontend possa ser testado de forma isolada e rápida no CI.
* **Fallback UI Logic:** Manter o desenvolvimento de interfaces resilientes (ex: iniciais do nome na ausência de avatar).

---

## 🧠 Key Lessons Learned
1. **CI/CD Security:** A falha no `curl` durante o deploy reforçou a importância da configuração correta de *Repository Secrets*.
2. **String Sensitivity:** Diferenças sutis entre "Seu Mundo Mindly" e "Teste Cypress" podem travar uma entrega; a consistência entre design e teste é vital.
3. **Git Hygiene:** O uso correto do `.gitignore` é a primeira linha de defesa para manter um repositório leve e profissional.

---

## 🚀 Action Items for Next Sprint
- [ ] Migrar armazenamento de mídia para **Supabase Storage**.
- [ ] Refatorar seletores do perfil para usar IDs únicos.
- [ ] Implementar verificação de cache para carregamento de imagens de perfil.

---
*Retrospective generated for Cristiano Tobias (EngSoftCris) - 2026*
