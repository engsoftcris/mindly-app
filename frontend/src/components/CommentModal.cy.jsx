// frontend/src/components/CommentModal.cy.jsx
import React from 'react'
import CommentModal from './CommentModal'
import api from '../api/axios'

describe('<CommentModal />', () => {

  const post = {
    id: 123,
    content: 'Post original',
    author: {
      id: 1,
      username: 'testuser',
      display_name: 'Test User',
      profile_picture: null,
    },
    created_at: new Date().toISOString(),
  }

  beforeEach(() => {
    cy.stub(api, 'get').as('apiGet')
    cy.stub(api, 'post').as('apiPost')
  })

  const stubGet = (payload) =>
    cy.get('@apiGet').then((stub) => stub.resolves(payload))

  const stubPost = (payload) =>
    cy.get('@apiPost').then((stub) => stub.resolves(payload))

  it('não renderiza quando isOpen=false', () => {
    cy.mount(
      <CommentModal
        post={post}
        isOpen={false}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    cy.get('[data-cy="comment-modal"]').should('not.exist')
  })

  it('carrega comentários ao abrir e renderiza a lista', () => {

    stubGet({
      data: [
        {
          id: 1,
          author_name: 'Alice',
          author_avatar: null,
          content: 'Primeiro comentário',
          created_at: new Date().toISOString(),
          media_url: null,
        },
      ],
    })

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    cy.get('@apiGet')
      .should('have.been.calledOnceWithExactly', '/comments/?post_id=123')

    cy.get('[data-cy="comments-list"]')
      .should('contain', 'Primeiro comentário')
  })

  it('desabilita Reply quando vazio e habilita ao digitar', () => {

    stubGet({ data: [] })

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    cy.get('[data-cy="reply-submit"]').should('be.disabled')

    cy.get('[data-cy="comment-input"]').type('Teste')

    cy.get('[data-cy="reply-submit"]').should('not.be.disabled')
  })

  it('envia comentário de texto corretamente', () => {
    stubGet({ data: [] })
    const created = {
      id: 10,
      author_name: 'Eu',
      content: 'Meu reply',
      created_at: new Date().toISOString(),
      media_url: null,
    }
    stubPost({ data: created })

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    // O segredo: .clear() primeiro para garantir o foco, depois o .type()
    cy.get('[data-cy="comment-input"]')
      .clear() 
      .type('Meu reply', { delay: 50 }) // Um pequeno delay ajuda o React a processar cada letra

    // Verifica se o botão habilitou antes de clicar
    cy.get('[data-cy="reply-submit"]').should('not.be.disabled').click()

    cy.get('@apiPost').should('have.been.calledOnce')
    cy.get('@apiPost').then((stub) => {
      const [url, formData] = stub.getCall(0).args
      expect(url).to.eq('/comments/')
      expect(formData.get('post')).to.eq("123")
      // Aqui usamos match para ignorar qualquer espaço em branco extra acidental
      expect(formData.get('content').trim()).to.eq('Meu reply')
    })
  })
  it('envia comentário com Gift corretamente', () => {
    stubGet({ data: [] })
    stubPost({
      data: {
        id: 11,
        author_name: 'Eu',
        content: '',
        created_at: new Date().toISOString(),
        media_url: 'https://media.giphy.com/test-gift.gif',
      },
    })

    // IMPORTANTE: O stub do fetch DEVE vir antes do mount
    cy.window().then((win) => {
      cy.stub(win, 'fetch').resolves({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            id: '1',
            images: {
              fixed_height: { url: 'https://media.giphy.com/test-gift.gif' },
              fixed_height_small: { url: 'https://media.giphy.com/test-gift-small.gif' },
            },
          }],
        }),
      })
    })

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    cy.get('[data-cy="open-gif"]').click()
    
    // Esperamos o item do GIF aparecer (o stub agora vai funcionar)
    cy.get('[data-cy="gif-item"]', { timeout: 10000 }).first().click({ force: true })
    cy.get('[data-cy="reply-submit"]').click()

    cy.get('@apiPost').then((stub) => {
      const [url, formData] = stub.getCall(0).args
      expect(formData.get('media_url')).to.eq('https://media.giphy.com/test-gift.gif')
      expect(formData.get('is_gif')).to.eq('true')
    })
  })
  it('remove Gift corretamente', () => {

    stubGet({ data: [] })

    cy.window().then((win) => {

      cy.stub(win, 'fetch').resolves({
        status: 200,
        json: async () => ({
          data: [
            {
              id: '1',
              images: {
                fixed_height: {
                  url: 'https://media.giphy.com/test-gift.gif',
                },
                fixed_height_small: {
                  url: 'https://media.giphy.com/test-gift-small.gif',
                },
              },
            },
          ],
        }),
      })

    })

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    cy.get('[data-cy="open-gif"]').click()

    cy.get('[data-cy="gif-item"]')
      .first()
      .click({ force: true })

    cy.get('[data-cy="remove-gif"]').click()

    cy.get('[data-cy="gif-preview"]').should('not.exist')

    cy.get('[data-cy="reply-submit"]').should('be.disabled')

  })

  it('fecha modal corretamente', () => {

    stubGet({ data: [] })

    const onClose = cy.stub().as('onClose')

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={onClose}
        onCommentAdded={cy.stub()}
      />
    )

    cy.get('[data-cy="comment-close"]').click()

    cy.get('@onClose').should('have.been.calledOnce')

  })
it('envia comentário com imagem do PC corretamente', () => {
    stubGet({ data: [] })

    const createdWithImage = {
      id: 12,
      author_name: 'Eu',
      content: 'Comentário com foto',
      created_at: new Date().toISOString(),
      image: 'https://supabase.co/storage/test_image.png',
      is_gif: false,
    }

    stubPost({ data: createdWithImage })

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    // 1. Simula a seleção de um arquivo no input escondido
    // Nota: O input precisa ter o data-cy="file-input"
    const fileName = 'test_image.png'
    cy.get('[data-cy="file-input"]').selectFile({
      contents: Cypress.Buffer.from('file contents'),
      fileName: fileName,
      lastModified: Date.now(),
    }, { force: true })

    // 2. Verifica se o preview da imagem apareceu
    cy.get('[data-cy="image-preview"]').should('be.visible')
    
    // 3. Digita um texto opcional
    cy.get('[data-cy="comment-input"]').type('Comentário com foto')

    // 4. Clica em enviar
    cy.get('[data-cy="reply-submit"]').click()

    // 5. Valida a chamada da API (especialmente o FormData)
    cy.get('@apiPost').should('have.been.calledOnce')
    
    cy.get('@apiPost').then((stub) => {
      const [url, formData] = stub.getCall(0).args
      
      expect(url).to.eq('/comments/')
      // No caso de FormData, verificamos usando o método .get()
      expect(formData.get('post')).to.eq(String(123))
      expect(formData.get('content')).to.eq('Comentário com foto')
      expect(formData.get('image')).to.not.be.null
    })

    // 6. Verifica se a imagem renderizou na lista após o sucesso
    cy.get('[data-cy="comments-list"]')
      .find('img[data-cy="comment-media"]')
      .should('have.attr', 'src', createdWithImage.image)
  })

  it('remove a imagem selecionada antes de enviar', () => {
    stubGet({ data: [] })

    cy.mount(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    )

    // Seleciona arquivo
    cy.get('[data-cy="file-input"]').selectFile({
      contents: Cypress.Buffer.from('test'),
      fileName: 'image.png'
    }, { force: true })

    cy.get('[data-cy="image-preview"]').should('exist')

    // Clica no botão de remover (o "X" que combinamos)
    cy.get('[data-cy="remove-image"]').click()

    cy.get('[data-cy="image-preview"]').should('not.exist')
    cy.get('[data-cy="reply-submit"]').should('be.disabled')
  })
})
