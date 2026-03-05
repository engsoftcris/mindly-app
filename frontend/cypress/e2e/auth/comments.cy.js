describe('Mindly - Fluxo de Comentários com data-cy', () => {
  const TEST_USER_ID = '123';

  // Mock fixo para evitar erros de "reading properties of undefined (reading 'url')"
  const fullGiphyResponse = {
    data: [{
      id: '1',
      title: 'Test GIF',
      images: {
        fixed_height: { url: 'https://media.giphy.com/test.gif' },
        fixed_height_small: { url: 'https://media.giphy.com/test-small.gif' },
      },
    }],
  };

  const mockProfile = { 
    id: TEST_USER_ID, 
    username: 'testuser', 
    display_name: 'Teste Cypress'
  };

  const mockFeed = {
    count: 1,
    results: [{
      id: 500,
      author: { id: TEST_USER_ID, username: 'testuser' },
      content: 'Post de teste para o Cypress',
      created_at: new Date().toISOString(),
    }],
  };

  const visitAuthed = (path = '/') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('refresh', 'fake-token')
        win.localStorage.setItem('user_id', TEST_USER_ID)
      },
    })
  };

  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.clearLocalStorage()
    cy.clearCookies()

    cy.intercept('GET', '/api/accounts/profile/', { statusCode: 200, body: mockProfile }).as('getProfile')
    cy.intercept('GET', '/api/accounts/feed/**', { statusCode: 200, body: mockFeed }).as('getFeed')
    cy.intercept('GET', '/api/comments/?post_id=500', { statusCode: 200, body: [] }).as('getComments')
    cy.intercept('GET', 'https://api.giphy.com/v1/gifs/**', { body: fullGiphyResponse }).as('giphyFetch')
    cy.intercept('GET', '/api/accounts/notifications/**', { body: [] }).as('getNotifications')
    cy.intercept('GET', '/api/accounts/suggested-follows/**', { body: [] }).as('getSuggested')
  })

  // 1. TESTE DE GIF
  it('Deve postar um comentário com texto e GIF usando seletores data-cy', () => {
    cy.intercept('POST', '/api/comments/', {
      statusCode: 201,
      body: { id: 999, author: { username: 'testuser' }, content: 'Comentário final! 🚀', media_url: 'https://media.giphy.com/test.gif', is_gif: true, created_at: new Date().toISOString() }
    }).as('postComment')

    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'])
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.wait('@getComments')
    cy.get('[data-cy="comment-input"]').type('Comentário final! 🚀')
    cy.get('[data-cy="open-gif"]').click({ force: true })
    cy.wait('@giphyFetch')
    cy.get('[data-cy="gif-item"]').first().scrollIntoView().click({ force: true })
    cy.get('[data-cy="reply-submit"]').should('not.be.disabled').click({ force: true })
    cy.wait('@postComment')
  })

  // 2. LIMITE DE CARACTERES
  it('Deve travar a digitação no limite de 280 caracteres (maxLength)', () => {
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    const longText = 'a'.repeat(300)
    cy.get('[data-cy="comment-input"]').type(longText, { delay: 0 })
    cy.get('[data-cy="chars-left"]').should('contain', '0')
    cy.get('[data-cy="comment-input"]').should('have.value', 'a'.repeat(280))
  })

  // 3. REMOVER GIF (CORRIGIDO MOCK)
  it('Deve permitir selecionar e remover um GIF antes de enviar', () => {
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="open-gif"]').click({ force: true })
    cy.wait('@giphyFetch')
    cy.get('[data-cy="gif-item"]').first().click({ force: true })
    cy.get('[data-cy="gif-preview"]').should('be.visible')
    cy.get('[data-cy="remove-gif"]').click({ force: true })
    cy.get('[data-cy="gif-preview"]').should('not.exist')
  })

  // 4. ESPAÇOS VAZIOS
  it('Deve manter o botão desabilitado se o comentário for apenas espaços', () => {
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="comment-input"]').type('      \n\n      ', { delay: 0 })
    cy.get('[data-cy="reply-submit"]').should('be.disabled')
  })

  // 5. LIMPAR ESTADO
  it('Deve limpar o estado ao fechar e abrir o modal novamente', () => {
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="comment-input"]').type('Texto que deve sumir')
    cy.get('[data-cy="comment-close"]').click({ force: true })
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="comment-input"]').should('have.value', '')
  })

  // 6. POSTAR IMAGEM
  it('Deve postar um comentário com imagem do PC usando seletores data-cy', () => {
    cy.intercept('POST', '/api/comments/', {
      statusCode: 201,
      body: { id: 1000, author: { username: 'testuser' }, content: 'Foto! 📸', image: 'test.png', created_at: new Date().toISOString() }
    }).as('postCommentImage')
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="file-input"]').selectFile({ contents: Cypress.Buffer.from('test'), fileName: 'test.png' }, { force: true })
    cy.get('[data-cy="reply-submit"]').click({ force: true })
    cy.wait('@postCommentImage')
  })

  // 7. REMOVER IMAGEM E TROCAR POR GIF (CORRIGIDO MOCK)
  it('Deve permitir remover a imagem selecionada e trocar por um GIF', () => {
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="file-input"]').selectFile({ contents: Cypress.Buffer.from('t'), fileName: 'i.png' }, { force: true })
    cy.get('[data-cy="remove-image"]').click({ force: true })
    cy.get('[data-cy="open-gif"]').click({ force: true })
    cy.wait('@giphyFetch')
    cy.get('[data-cy="gif-item"]').first().click({ force: true })
    cy.get('[data-cy="gif-preview"]').should('exist')
  })

  // 8. ERRO DE API
  it('Deve mostrar mensagem de erro se a API falhar', () => {
    cy.intercept('POST', '/api/comments/', { statusCode: 400, body: { detail: 'Erro fatal' } }).as('postError')
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="comment-input"]').type('Tentativa')
    cy.get('[data-cy="reply-submit"]').click({ force: true })
    cy.wait('@postError')
    cy.get('.Toastify__toast--error').should('be.visible')
  })

  // 9. MODERAÇÃO (CORRIGIDO SELETORES DO MODAL)
  it('Deve permitir ao dono do post deletar comentário de terceiros (Moderação)', () => {
    cy.intercept('GET', '/api/comments/?post_id=500', {
      body: [{ id: 888, author: { id: 'outro' }, content: 'Intruso', created_at: new Date().toISOString() }]
    }).as('getOtherComments')
    cy.intercept('DELETE', '/api/comments/888/', { statusCode: 204 }).as('deleteComment')

    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.wait('@getOtherComments')
    
    cy.get('[data-cy="comment-item"]').first().within(() => {
      cy.get('[data-cy="comment-delete"]').click({ force: true })
    })
    
    // Tenta pelo data-cy, se não achar, busca pelo texto do botão de confirmação
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="confirm-delete"]').length) {
        cy.get('[data-cy="confirm-delete"]').click({ force: true })
      } else {
        cy.get('button').contains(/Confirm|Delete|Excluir/i).click({ force: true })
      }
    })
    cy.wait('@deleteComment')
  })

  // 10. EDIÇÃO (CORRIGIDO SELETORES DO MODAL)
  it('Deve permitir editar o próprio comentário e refletir a mudança', () => {
    cy.intercept('GET', '/api/comments/?post_id=500', {
      body: [{ 
        id: 777, 
        author: { id: TEST_USER_ID, username: 'testuser' }, 
        content: 'Original', 
        created_at: new Date().toISOString() 
      }]
    }).as('getMyComments')
    
    cy.intercept('PATCH', '/api/comments/777/', { 
      statusCode: 200, 
      body: { id: 777, content: 'Editado', author: { id: TEST_USER_ID } } 
    }).as('patchComment')

    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.wait('@getMyComments')

    cy.get('[data-cy="comment-item"]').first().within(() => {
      cy.get('[data-cy="comment-edit"]').click({ force: true })
    })

    // O log mostrou que o textarea é encontrado, então limpamos e digitamos
    cy.get('textarea').last().clear({ force: true }).type('Editado')
    
    // CORREÇÃO FINAL: O log confirmou que o botão é <button.text-blue-500>
    // Clicamos nele diretamente por classe/posição para ignorar erros de tradução ou ícones
    cy.get('button.text-blue-500').last().click({ force: true })
    
    cy.wait('@patchComment')
    cy.contains('Editado').should('be.visible')
  })
  // 11. VAZIO
  it('Não deve permitir postar comentário vazio...', () => {
    cy.intercept('POST', '/api/comments/', { statusCode: 201 }).as('postComment')
    visitAuthed('/')
    cy.get('[data-cy="comment-button"]').first().click({ force: true })
    cy.get('[data-cy="reply-submit"]').click({ force: true })
    cy.get('@postComment.all').should('have.length', 0) 
  })
});