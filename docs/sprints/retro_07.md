# 🔄 Sprint 7 Retrospective - Mindly (14/02 - 21/02)

## 🟢 Keep Doing (O que funcionou)
* **Padrão de Commits:** Uso consistente dos IDs das tarefas (`TAL-XX`) nos commits, facilitando o rastreio no GitHub Actions.
* **Testes de Componente:** Adoção do Cypress para validar componentes isolados, garantindo que a lógica de UI (como notificações e likes) chegue sólida ao E2E.
* **Fluxo de Pull Requests:** Manutenção de branches de feature separadas, mantendo a integridade da branch `main`.
* **Micro-interações:** Implementação de feedbacks visuais imediatos (animações de like e double-tap para delete), elevando o nível da UX.

## 🔴 Stop Doing (O que precisamos parar)
* **Secrets Expostos:** Parar de declarar chaves de API (`GIPHY`, `FIREBASE`, etc.) diretamente no código do ficheiro `.yml`.
* **Deploy Prematuro:** Parar de disparar o Deploy Hook para a Render antes da conclusão total da suite de testes.
* **Dependências Fracas no CI:** Parar de configurar jobs que não validam o sucesso dos passos anteriores de forma absoluta.
* **Asserções Rígidas em Testes:** Parar de usar seletores ou URLs fixas que não lidam bem com a latência do ambiente de CI.

## 🟡 Start Doing (O que vamos iniciar na Sprint 8)
* **GitHub Secrets Migration:** Migrar todas as variáveis sensíveis do pipeline para o cofre de segredos do repositório.
* **Branch Protection Rules:** Ativar regras no GitHub para impedir o merge se os testes falharem.
* **Pipeline Blindado:** Implementar a lógica `needs: [test-backend, test-frontend-component, test-frontend-e2e]` para o job de deploy.
* **Overlapping Deploy Policy:** Ajustar a política de deploy na Render para evitar cancelamentos de deploys em curso quando um novo é disparado.

---

## 🚀 Action Items (Próximas Tarefas)
1. **DevOps:** Mover chaves da Giphy e Firebase para `Settings > Secrets and variables`.
2. **CI/CD:** Refatorar o `workflow.yml` com travas de segurança `if: success()`.
3. **Qualidade:** Ajustar timeouts globais do Cypress para compensar a performance do runner do GitHub.
