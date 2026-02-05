# 🏁 Sprint Review & Retrospective - Mindly

**Sprint:** 04 (Infraestrutura & Auth Base)
**Período:** 26/01/2026 a 31/01/2026 (Fechamento antecipado para alinhamento)
**Status:** CONCLUÍDA 🚀

---

## 🔍 1. Sprint Review (O QUE foi entregue)

O foco desta sprint foi estabilizar o ambiente de desenvolvimento e garantir que o deploy fosse contínuo, evitando erros de infraestrutura antes de iniciar as funcionalidades sociais.

### ✅ Itens Entregues:
* **Pipeline CI/CD:** Configuração completa do GitHub Actions. O código agora é testado e validado automaticamente a cada push.
* **Deploy Automatizado:** * **Backend:** Rodando no Render (Dockerizado + Postgres).
    * **Frontend:** Rodando na Vercel (React).
* **Correção de Rotas (Vercel):** Implementação do `vercel.json` para resolver o erro 404 ao atualizar a página (Refresh).
* **Autenticação Google:** Integração completa do Google Cloud Console no Front e no Back.

### 📊 Status do Backlog (Épico 01):
* [x] Setup Docker (Django + React + Postgres)
* [x] Auth JWT & LocalStorage
* [x] Login Social Google
* [x] Infra: CI/CD & Deploy Staging

---

## 🧠 2. Sprint Retrospective (COMO foi o trabalho)

### 🟢 Pontos Positivos
* **Velocidade:** Conclusão do escopo planejado antes do prazo final (02/02).
* **Estabilidade:** O ambiente de produção agora espelha fielmente o ambiente local.
* **Decisão Estratégica:** Readaptação do backlog para foco no MVP de Março, eliminando complexidades desnecessárias (Facebook/Telefone).

### 🟡 Pontos de Atenção / Dificuldades
* **Roteamento SPA:** O comportamento das rotas no servidor da Vercel exigiu uma configuração específica que não estava prevista inicialmente.
* **Ajuste de Calendário:** A necessidade de sincronizar as sprints com o início da semana (segunda-feira).

### 🔵 Próximos Passos (Action Items)
1.  **Estudo de Revisão:** Aproveitar o tempo ganho para reforçar conceitos de Django/React antes do Épico de Perfil.
2.  **Sprint 05:** Iniciar o desenvolvimento do Perfil do Usuário (UUID, Bio, Foto) na segunda-feira às 13:30.

---

**Assinado:** Cris Dev Team
**Data:** 31 de Janeiro de 2026
