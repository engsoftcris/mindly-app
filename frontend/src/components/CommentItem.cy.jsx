import CommentItem from "./CommentItem";
import { mount } from "cypress/react";
import api from "../api/axios";
import { toast } from "react-toastify";

const baseComment = (overrides = {}) => ({
  id: 10,
  author: 7, // pode ser number/string/obj; o toId normaliza
  author_id: 7,
  author_name: "cris",
  author_avatar: "",
  content: "Conteúdo original",
  media_url: null,
  image: null,
  created_at: new Date("2026-02-28T10:00:00Z").toISOString(),
  ...overrides,
});

describe("CommentItem (component)", () => {
  beforeEach(() => {
    // Stubs de toast
    cy.stub(toast, "success").as("toastSuccess");
    cy.stub(toast, "info").as("toastInfo");
    cy.stub(toast, "error").as("toastError");

    // Stubs da API (axios instance)
    cy.stub(api, "patch").as("apiPatch");
    cy.stub(api, "delete").as("apiDelete");
  });

  afterEach(() => {
    // Restaura stubs (evita bleed entre testes)
    toast.success.restore();
    toast.info.restore();
    toast.error.restore();
    api.patch.restore();
    api.delete.restore();
  });

  const mountComponent = (props = {}) => {
    const onDeleteSuccess = cy.stub().as("onDeleteSuccess");

    mount(
      <CommentItem
        comment={baseComment()}
        currentUserId={"7"}      // IMPORTANT: string (comparação é ===)
        postOwnerId={"7"}        // IMPORTANT: string
        onDeleteSuccess={onDeleteSuccess}
        {...props}
      />
    );

    // Os botões ficam opacity-0 até hover (group-hover)
    cy.get(".group").trigger("mouseover");
  };

  it("mostra Edit e Delete quando currentUser é o autor (e dono do post)", () => {
    mountComponent({
      comment: baseComment({ author: 7 }),
      currentUserId: "7",
      postOwnerId: "7",
    });

    cy.get('button[title="Edit comment"]').should("exist");
    cy.get('button[title="Delete"]').should("exist");
  });

  it("mostra apenas Delete (moderation) quando currentUser é dono do post mas não é autor do comentário", () => {
    mountComponent({
      comment: baseComment({ author: 999, author_id: 999 }),
      currentUserId: "7",
      postOwnerId: "7",
    });

    cy.get('button[title="Edit comment"]').should("not.exist");
    cy.get('button[title="Remove comment (moderation)"]').should("exist");
  });

  it("não mostra Edit nem Delete quando não é autor nem dono do post", () => {
    mountComponent({
      comment: baseComment({ author: 999, author_id: 999 }),
      currentUserId: "7",
      postOwnerId: "123",
    });

    cy.get('button[title="Edit comment"]').should("not.exist");
    cy.get('button[title="Delete"]').should("not.exist");
    cy.get('button[title="Remove comment (moderation)"]').should("not.exist");
  });

  it("edita com sucesso: abre editor, PATCH, atualiza conteúdo e fecha", () => {
  const comment = baseComment({ author: 7, content: "Antes" })

  api.patch.resolves({ data: { content: "Depois" } })

  mountComponent({
    comment,
    currentUserId: "7",
    postOwnerId: "7",
  })

  cy.get('button[title="Edit comment"]').click()

  cy.get("textarea").clear().type("Depois")
  cy.get('button[title="Save"]').click()

  cy.get("@apiPatch").should("have.been.calledOnce")

  // ✅ mensagem real do componente
  cy.get("@toastSuccess").should("have.been.calledWith", "Comentário atualizado!")

  // Editor fechou e conteúdo renderiza novo
  cy.get("textarea").should("not.exist")
  cy.contains("Depois").should("be.visible")
})


  it("não envia PATCH se tentar salvar vazio (comportamento atual: cancela e reverte)", () => {
    const comment = baseComment({ author: 7, content: "Texto antigo" });

    mountComponent({
      comment,
      currentUserId: "7",
      postOwnerId: "7",
    });

    cy.get('button[title="Edit comment"]').click();

    cy.get("textarea").clear().type("   "); // trim => vazio
    cy.get('button[title="Save"]').click();

    cy.get("@apiPatch").should("not.have.been.called");
    cy.get("textarea").should("not.exist");
    cy.contains("Texto antigo").should("be.visible");
  });

  it("PATCH falha: mostra toast.error com mensagem do backend", () => {
    const comment = baseComment({ author: 7, content: "Antes" });

    api.patch.rejects({
      response: { data: { detail: "Comentário não pode ficar vazio." } },
    });

    mountComponent({
      comment,
      currentUserId: "7",
      postOwnerId: "7",
    });

    cy.get('button[title="Edit comment"]').click();

    cy.get("textarea").clear().type("Novo texto");
    cy.get('button[title="Save"]').click();

    cy.get("@apiPatch").should("have.been.calledOnce");
    cy.get("@toastError").should(
      "have.been.calledWith",
      "Comentário não pode ficar vazio."
    );
  });

 it("delete com confirmação: chama api.delete, chama callback e mostra toast", () => {
    const commentId = "321";
    const comment = baseComment({ 
      id: commentId, 
      author: "999", 
      author_id: "999" 
    }); 
    
    api.delete.resolves({ status: 204 });

    mountComponent({
      comment,
      currentUserId: "7",
      postOwnerId: "7",
    });

    // ✅ O SEGREDO: Usamos { force: true } para clicar mesmo com opacity-0
    cy.get('button[title="Remove comment (moderation)"]')
      .click({ force: true });

    cy.contains("Remove this comment from your post?").should("be.visible");
    cy.contains("Confirm").click();

    cy.get("@apiDelete").should("have.been.calledWith", `/comments/${commentId}/`);
    cy.get("@onDeleteSuccess").should("have.been.calledWith", commentId);
    cy.get("@toastInfo").should("have.been.calledWith", "Comentário removido.");
  });
});