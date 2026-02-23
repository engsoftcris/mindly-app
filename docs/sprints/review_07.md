# 📋 Sprint 7 Review - Mindly (14/02 - 21/02)

## 🚀 Funcionalidades Sociais & Engajamento
* **TAL-18 (Central de Notificações):** Implementação da página de notificações com lógica de visualização ("mark as read") e suite de testes de componente Cypress.
* **TAL-17 (Sistema de Comentários):** Integração com **Giphy API** para seletor de GIFs e implementação da interface de comentários.
* **TAL-16 (Sistema de Likes):** Desenvolvimento do endpoint de likes e micro-interações no frontend com testes de estabilidade.
* **TAL-14 & TAL-21 (Sistema de Seguidores e Bloqueio):** Lógica de "Follow" com restrição de 48h e sistema de bloqueio de utilizadores.

## 🛡️ Privacidade, Persistência e UI
* **TAL-30 (Privacidade de Perfil):** Implementação da lógica de perfis privados e ajustes de visibilidade de componentes.
* **TAL-38 (Soft Delete):** Lógica de exclusão lógica no backend e interface de "double-tap" para remoção de conteúdo.
* **TAL-20 (Galeria e Filtros):** Implementação de filtros de média e visualização em Grid no perfil do utilizador.
* **TAL-41 (Reatividade):** Correção de redirecionamento e atualização automática da UI após ações de bloqueio.

## ⚙️ Infraestrutura e CI/CD (DevOps)
* **TAL-29 (Supabase Storage):** Setup do armazenamento de mídia via Supabase e fluxo de moderação.
* **Estabilização do Pipeline:**
    * Injeção de variáveis de ambiente (**Giphy, Firebase**) nos jobs de teste.
    * Configuração do `cy.mount` e `supportFile` para **Cypress Component Testing**.
    * Bypass de CSRF para o endpoint de *health check* visando monitoramento.
* **Deploy Automatizado:** Configuração de Deploy Hooks para sincronização com a **Render**.

## 📊 Sumário da Sprint
| Categoria | Status |
| :--- | :--- |
| **Tarefas Finalizadas** | 12 |
| **Build Status** | Passando (CI/CD Pipeline #55) |
| **Ambiente** | Produção atualizada via Render |


