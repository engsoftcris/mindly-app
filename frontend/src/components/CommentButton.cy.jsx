import React from "react";
import CommentButton from "./CommentButton";

describe("<CommentButton />", () => {

  it("renderiza corretamente sem contador quando count = 0", () => {
    cy.mount(
      <CommentButton
        count={0}
        hasCommented={false}
        onClick={() => {}}
      />
    );

    cy.get('[data-cy="comment-button"]').should("exist");
    cy.get('[data-cy="comment-count"]').should("have.text", "");
    cy.get('[data-cy="comment-button"]').should("have.class", "text-gray-500");
  });


  it("mostra o contador quando count > 0", () => {
    cy.mount(
      <CommentButton
        count={5}
        hasCommented={false}
        onClick={() => {}}
      />
    );

    cy.get('[data-cy="comment-count"]').should("contain", "5");
  });


  it("mostra cor azul quando hasCommented=true", () => {
    cy.mount(
      <CommentButton
        count={3}
        hasCommented={true}
        onClick={() => {}}
      />
    );

    cy.get('[data-cy="comment-button"]')
      .should("have.class", "text-blue-500");
  });


  it("chama onClick quando clicado", () => {
    const onClickSpy = cy.spy().as("onClickSpy");

    cy.mount(
      <CommentButton
        count={1}
        hasCommented={false}
        onClick={onClickSpy}
      />
    );

    cy.get('[data-cy="comment-button"]').click();

    cy.get("@onClickSpy").should("have.been.calledOnce");
  });


  it("não propaga o clique para o elemento pai", () => {
    const parentSpy = cy.spy().as("parentSpy");
    const buttonSpy = cy.spy().as("buttonSpy");

    cy.mount(
      <div data-cy="parent" onClick={parentSpy}>
        <CommentButton
          count={1}
          hasCommented={false}
          onClick={buttonSpy}
        />
      </div>
    );

    cy.get('[data-cy="comment-button"]').click();

    cy.get("@buttonSpy").should("have.been.calledOnce");
    cy.get("@parentSpy").should("not.have.been.called");
  });

});
