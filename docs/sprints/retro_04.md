# 🧠 Sprint Retrospective - Mindly

**Sprint:** 04 (Infra & Auth)
**Data:** 31/01/2026

---

## 🟢 1. O que funcionou bem? (Manter/Continue)
* **Pipeline de Deploy:** A automação GitHub -> Vercel/Render reduziu drasticamente o tempo gasto com publicação manual.
* **Sincronização Back/Front:** A decisão de resolver o CORS e o Google Auth logo no início evitou "dores de cabeça" futuras.
* **Gestão de Escopo:** A capacidade de perceber que Facebook/Telefone eram gargalos e priorizar o que traz valor real para o projeto até Março.

## 🔴 2. O que não funcionou bem? (Parar/Stop)
* **Configurações de Rota no Escuro:** Perda de tempo tentando entender o erro 404 da Vercel sem consultar a documentação específica de SPAs logo de início.
* **Calendário Quebrado:** Iniciar sprints no meio da semana causa confusão mental no acompanhamento das datas. 

## 🟡 3. O que vamos começar a fazer? (Começar/Start)
* **Git Flow Rígido:** Sempre fazer `git pull origin main` e garantir que a branch local está sincronizada antes de começar qualquer Task do Épico 02.
* **Documentação de Erros:** Criar um log rápido (pode ser no Notion ou num arquivo .txt) de soluções de infra para não bater a cabeça no mesmo erro duas vezes.
* **Sincronia com o Calendário:** Fechar sprints sempre no final de semana para começar a Planning "limpa" na segunda-feira.

---

## 🎯 Plano de Ação para a Sprint 05 (02/02):
1.  **Revisão Teórica:** Utilizar o restante do dia de hoje para o curso de revisão, focando em manipulação de imagens e modelos Django (preparação para o Perfil).
2.  **Configuração de Mídia:** Já entrar na segunda-feira sabendo qual serviço de Storage (S3 ou Cloudinary) será usado para as fotos de perfil.
3.  **Foco em Story Points:** Manter a meta de 7 SP por semana para garantir a entrega de Março.

---
**Frase da Sprint:** "Infra resolvida, agora é funcionalidade na veia."
