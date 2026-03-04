// comments.cy.js - correção final

describe('Mindly - Fluxo de Comentários com data-cy', () => {
  const mockProfile = { 
    id: '123', 
    username: 'testuser', 
    display_name: 'Teste Cypress',
    profile_picture: null 
  }

  const mockFeed = {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 500,
        author: { 
          username: 'dono_do_post', 
          display_name: 'Dono do Post',
          profile_picture: null
        },
        content: 'Post de teste para o Cypress',
        comments_count: 0,
        likes_count: 0,
        is_liked: false,
        created_at: new Date().toISOString(),
      },
    ],
  }

  const visitAuthed = (path = '/') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123')
        win.localStorage.setItem('refresh', 'fake-refresh-123')
      },
    })
  }

  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.clearLocalStorage()
    cy.clearCookies()

    cy.intercept('GET', '/api/accounts/profile/', {
      statusCode: 200,
      body: mockProfile,
    }).as('getProfile')

    cy.intercept('GET', '/api/accounts/feed/**', {
      statusCode: 200,
      body: mockFeed,
    }).as('getFeed')

    // CORREÇÃO: Usar a URL exata que o frontend chama (SEM /accounts/)
    cy.intercept('GET', '/api/comments/?post_id=500', {
      statusCode: 200,
      body: [],
    }).as('getComments')

    cy.intercept('GET', '/api/accounts/notifications/**', {
      statusCode: 200,
      body: []
    }).as('getNotifications')

    cy.intercept('GET', '/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: []
    }).as('getSuggested')
  })

  it('Deve postar um comentário com texto e GIF usando seletores data-cy', () => {
    cy.intercept('GET', 'https://api.giphy.com/v1/gifs/**', {
      statusCode: 200,
      body: {
        data: [
          {
            id: '1',
            title: 'Test GIF',
            images: {
              fixed_height: { url: 'https://media.giphy.com/test.gif' },
              fixed_height_small: { url: 'https://media.giphy.com/test-small.gif' },
            },
          },
        ],
      },
    }).as('giphyFetch')

    // CORREÇÃO: POST de comentários também SEM /accounts/
    cy.intercept('POST', '/api/comments/', {
      statusCode: 201,
      body: {
        id: 999,
        author: {
          username: 'testuser',
          profile_picture: null
        },
        content: 'Comentário final! 🚀',
        media_url: 'https://media.giphy.com/test.gif',
        is_gif: true,
        created_at: new Date().toISOString(),
      },
    }).as('postComment')

    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 })

    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })

    cy.get('[data-cy="comment-modal"]', { timeout: 10000 }).should('be.visible')
    
    // AGORA deve funcionar porque a URL está correta
    cy.wait('@getComments', { timeout: 10000 })

    cy.get('[data-cy="comment-input"]', { timeout: 10000 }).type('Comentário final! 🚀')
    cy.get('[data-cy="open-gif"]', { timeout: 10000 }).click({ force: true })
    cy.wait('@giphyFetch', { timeout: 10000 })

    cy.get('[data-cy="gif-item"]', { timeout: 10000 })
      .first()
      .scrollIntoView()
      .click({ force: true })

    cy.get('[data-cy="gif-preview"]', { timeout: 10000 }).should('exist')
    cy.get('[data-cy="reply-submit"]', { timeout: 10000 })
      .should('not.be.disabled')
      .click({ force: true })

    cy.wait('@postComment', { timeout: 10000 })

    cy.get('[data-cy="comment-item"]', { timeout: 10000 })
      .first()
      .within(() => {
        cy.get('[data-cy="comment-content"]').should('contain', 'Comentário final!')
        cy.get('[data-cy="comment-media"]')
          .should('have.attr', 'src')
          .and('contain', 'https://media.giphy.com/test.gif')
      })
  })

  it('Deve travar a digitação no limite de 280 caracteres (maxLength)', () => {
    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 })
    
    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })

    cy.wait('@getComments', { timeout: 10000 })

    const longText = 'a'.repeat(300)
    cy.get('[data-cy="comment-input"]', { timeout: 10000 })
      .type(longText, { delay: 0 })

    cy.get('[data-cy="chars-left"]', { timeout: 10000 })
      .should('contain', '0')
    
    cy.get('[data-cy="comment-input"]')
      .should('have.value', 'a'.repeat(280))
    
    cy.get('[data-cy="reply-submit"]')
      .should('not.be.disabled')
  })

  it('Deve permitir selecionar e remover um GIF antes de enviar', () => {
    cy.intercept('GET', 'https://api.giphy.com/v1/gifs/**', {
      body: { 
        data: [{ 
          id: '1', 
          images: { 
            fixed_height: { url: 'https://media.giphy.com/test.gif' },
            fixed_height_small: { url: 'https://media.giphy.com/test-small.gif' }
          } 
        }] 
      }
    }).as('giphyFetch')

    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 })
    
    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })

    cy.wait('@getComments', { timeout: 10000 })

    cy.get('[data-cy="open-gif"]', { timeout: 10000 }).click()
    cy.wait('@giphyFetch', { timeout: 10000 })
    
    cy.get('[data-cy="gif-item"]', { timeout: 10000 })
      .first()
      .click({ force: true })

    cy.get('[data-cy="gif-preview"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy="remove-gif"]', { timeout: 10000 }).click()
    cy.get('[data-cy="gif-preview"]', { timeout: 10000 }).should('not.exist')
    cy.get('[data-cy="reply-submit"]', { timeout: 10000 }).should('be.disabled')
  })

  it('Deve manter o botão desabilitado se o comentário for apenas espaços', () => {
    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 })
    
    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })

    cy.get('[data-cy="comment-input"]', { timeout: 10000 })
      .type('      \n\n      ', { delay: 0 })
    
    cy.get('[data-cy="reply-submit"]', { timeout: 10000 })
      .should('be.disabled')
  })

  it('Deve limpar o estado ao fechar e abrir o modal novamente', () => {
    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 })
    
    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })
    
    cy.get('[data-cy="comment-input"]', { timeout: 10000 })
      .type('Texto que deve sumir')
    
    cy.get('[data-cy="comment-close"]', { timeout: 10000 }).click()
    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })
    
    cy.get('[data-cy="comment-input"]', { timeout: 10000 })
      .should('have.value', '')
  })

  it('Deve postar um comentário com imagem do PC usando seletores data-cy', () => {
    cy.intercept('POST', '/api/comments/', {
      statusCode: 201,
      body: {
        id: 1000,
        author: {
          username: 'testuser',
          profile_picture: null
        },
        content: 'Olha essa foto! 📸',
        image: 'https://storage.com/comment_images/test.png',
        is_gif: false,
        created_at: new Date().toISOString(),
      },
    }).as('postCommentWithImage')

    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 })

    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })
    
    cy.wait('@getComments', { timeout: 10000 })

    cy.get('[data-cy="file-input"]', { timeout: 10000 })
      .selectFile(
        {
          contents: Cypress.Buffer.from('file contents'),
          fileName: 'test_image.png',
          lastModified: Date.now(),
        },
        { force: true }
      )

    cy.get('[data-cy="comment-input"]', { timeout: 10000 })
      .type('Olha essa foto! 📸')

    cy.get('[data-cy="image-preview"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy="reply-submit"]', { timeout: 10000 }).click()
    cy.wait('@postCommentWithImage', { timeout: 10000 })
  })

  it('Deve permitir remover a imagem selecionada e trocar por um GIF', () => {
    cy.intercept('GET', 'https://api.giphy.com/v1/gifs/**', {
      body: { 
        data: [{ 
          id: '1', 
          images: { 
            fixed_height: { url: 'https://media.giphy.com/gif.gif' },
            fixed_height_small: { url: 'https://media.giphy.com/gif-small.gif' }
          } 
        }] 
      }
    }).as('giphyFetch')

    visitAuthed('/')
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 })
    
    cy.get('[data-cy="comment-button"]', { timeout: 10000 })
      .first()
      .click({ force: true })

    cy.wait('@getComments', { timeout: 10000 })

    cy.get('[data-cy="file-input"]', { timeout: 10000 })
      .selectFile({
        contents: Cypress.Buffer.from('test'),
        fileName: 'image.png'
      }, { force: true })
    
    cy.get('[data-cy="image-preview"]', { timeout: 10000 }).should('exist')
    cy.get('[data-cy="remove-image"]', { timeout: 10000 }).click()
    cy.get('[data-cy="image-preview"]', { timeout: 10000 }).should('not.exist')

    cy.get('[data-cy="open-gif"]', { timeout: 10000 }).click()
    cy.wait('@giphyFetch', { timeout: 10000 })
    
    cy.get('[data-cy="gif-item"]', { timeout: 10000 })
      .first()
      .click({ force: true })
    
    cy.get('[data-cy="gif-preview"]', { timeout: 10000 }).should('exist')
    cy.get('[data-cy="reply-submit"]', { timeout: 10000 }).should('not.be.disabled')
  })
})