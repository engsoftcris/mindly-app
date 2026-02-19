describe('Mindly - Fluxo de Comentários com data-cy', () => {
  const mockProfile = { id: '123', username: 'testuser', display_name: 'Teste Cypress' }

  const mockPost = {
    count: 1,
    results: [
      {
        id: 500,
        author: { username: 'dono_do_post', display_name: 'Dono do Post' },
        content: 'Post de teste para o Cypress',
        comments_count: 0,
      },
    ],
  }

  const visitAuthed = (path = '/') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        // ajuste se seu app usa "accessToken" etc.
        win.localStorage.setItem('access', 'fake-token-123')
      },
    })
  }

  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.intercept('GET', /\/(api\/)?accounts\/profile\/?.*$/, {
      statusCode: 200,
      body: mockProfile,
    }).as('getProfile')

    cy.intercept('GET', /\/(api\/)?(accounts\/)?posts\/?.*$/, {
      statusCode: 200,
      body: mockPost,
    }).as('getPosts')

    cy.intercept('GET', '**/api/comments/?post_id=500', {
      statusCode: 200,
      body: [],
    }).as('getComments')
  })

  it('Deve postar um comentário com texto e GIF usando seletores data-cy', () => {
    // ✅ Mock do Giphy no formato que o GifSelector usa:
    // gif.images.fixed_height_small.url e gif.images.fixed_height.url
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

    cy.intercept('POST', '**/api/comments/', {
      statusCode: 201,
      body: {
        id: 999,
        author_name: 'testuser',
        content: 'Comentário final! 🚀',
        media_url: 'https://media.giphy.com/test.gif',
        created_at: new Date().toISOString(),
      },
    }).as('postComment')

    visitAuthed('/')

    cy.wait(['@getProfile', '@getPosts'])

    // 1) Abrir modal de comentário
    cy.get('[data-cy="comment-button"]').first().click({ force: true })

    // 2) Modal abriu
    cy.get('[data-cy="comment-modal"]').should('be.visible')
    cy.wait('@getComments')

    // 3) Digitar comentário
    cy.get('[data-cy="comment-input"]').type('Comentário final! 🚀')

    // 4) Abrir seletor de GIF
    cy.get('[data-cy="open-gif"]').click({ force: true })
    cy.wait('@giphyFetch')

    // 5) Selecionar o primeiro GIF (data-cy no GifSelector)
    cy.get('[data-cy="gif-item"]').first().scrollIntoView().click({ force: true })

    // 6) Preview e enviar
    cy.get('[data-cy="gif-preview"]').should('exist')
    cy.get('[data-cy="reply-submit"]').should('not.be.disabled').click({ force: true })

    // 7) Validar envio
    cy.wait('@postComment')

    // 8) Validar render do comentário (topo)
    cy.get('[data-cy="comment-item"]').first().within(() => {
      cy.get('[data-cy="comment-content"]').should('contain', 'Comentário final!')
      cy.get('[data-cy="comment-media"]')
        .should('have.attr', 'src')
        .and('contain', 'https://media.giphy.com/test.gif')
    })
  })
 it('Deve travar a digitação no limite de 280 caracteres (maxLength)', () => {
    visitAuthed('/');
    cy.wait(['@getProfile', '@getPosts']);
    cy.get('[data-cy="comment-button"]').first().click({ force: true });

    // Tenta digitar 300 caracteres para forçar o estouro
    const longText = 'a'.repeat(300);
    // { delay: 0 } para o teste ser rápido
    cy.get('[data-cy="comment-input"]').type(longText, { delay: 0 });

    // 1. O contador deve ter parado no 0 (porque o maxLength impediu o resto)
    cy.get('[data-cy="chars-left"]').should('contain', '0');
    
    // 2. O valor real no textarea deve ter exatamente 280 caracteres
    cy.get('[data-cy="comment-input"]').should('have.value', 'a'.repeat(280));
    
    // 3. O botão de enviar ainda deve estar habilitado (pois 280 é o limite permitido)
    cy.get('[data-cy="reply-submit"]').should('not.be.disabled');
  });

  it('Deve permitir selecionar e remover um GIF antes de enviar', () => {
    cy.intercept('GET', 'https://api.giphy.com/v1/gifs/**', {
      body: { data: [{ id: '1', images: { fixed_height: { url: 'https://media.giphy.com/test.gif' }, fixed_height_small: { url: 'https://media.giphy.com/test-small.gif' } } }] }
    }).as('giphyFetch');

    visitAuthed('/');
    cy.wait(['@getProfile', '@getPosts']);
    cy.get('[data-cy="comment-button"]').first().click({ force: true });

    // Abre e seleciona GIF
    cy.get('[data-cy="open-gif"]').click();
    cy.wait('@giphyFetch');
    cy.get('[data-cy="gif-item"]').first().click({ force: true });

    // Valida que o preview apareceu
    cy.get('[data-cy="gif-preview"]').should('be.visible');

    // Clica no botão de remover (o "X" que você colocou no preview)
    cy.get('[data-cy="remove-gif"]').click();

    // O preview deve sumir
    cy.get('[data-cy="gif-preview"]').should('not.exist');
    
    // O botão de enviar deve estar desabilitado (se o texto estiver vazio)
    cy.get('[data-cy="reply-submit"]').should('be.disabled');
  });
  it('Deve manter o botão desabilitado se o comentário for apenas espaços', () => {
    visitAuthed('/');
    cy.get('[data-cy="comment-button"]').first().click({ force: true });

    // Digita apenas espaços e quebras de linha
    cy.get('[data-cy="comment-input"]').type('      \n\n      ');
    
    // O botão deve continuar desabilitado (trim() no frontend)
    cy.get('[data-cy="reply-submit"]').should('be.disabled');
  });

  it('Deve limpar o estado ao fechar e abrir o modal novamente', () => {
    visitAuthed('/');
    cy.wait(['@getProfile', '@getPosts']);
    
    // 1. Abre o post e digita algo
    cy.get('[data-cy="comment-button"]').first().click({ force: true });
    cy.get('[data-cy="comment-input"]').type('Texto que deve sumir');
    
    // 2. Fecha o modal
    cy.get('[data-cy="comment-close"]').click();

    // 3. Abre o MESMO post (índice 0) novamente
    cy.get('[data-cy="comment-button"]').first().click({ force: true });
    
    // 4. Valida se o input está limpo
    // Isso confirma que o seu useEffect no CommentModal.jsx está resetando o estado
    cy.get('[data-cy="comment-input"]').should('have.value', '');
  });
  it('Deve postar um comentário com imagem do PC usando seletores data-cy', () => {
    // 1) Intercept do POST para imagem
    cy.intercept('POST', '**/api/comments/', {
      statusCode: 201,
      body: {
        id: 1000,
        author_name: 'testuser',
        content: 'Olha essa foto! 📸',
        image: 'https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/comment_images/test.png',
        media_url: null,
        is_gif: false,
        created_at: new Date().toISOString(),
      },
    }).as('postCommentWithImage');

    visitAuthed('/');
    cy.wait(['@getProfile', '@getPosts']);

    // 2) Abrir modal
    cy.get('[data-cy="comment-button"]').first().click({ force: true });
    cy.wait('@getComments');

    // 3) Selecionar arquivo do PC
    // O selectFile simula o usuário escolhendo o arquivo na janela do SO
    const fileName = 'test_image.png';
    cy.get('[data-cy="file-input"]').selectFile({
      contents: Cypress.Buffer.from('file contents'),
      fileName: fileName,
      lastModified: Date.now(),
    }, { force: true });

    // 4) Digitar texto e validar preview
    cy.get('[data-cy="comment-input"]').type('Olha essa foto! 📸');
    cy.get('[data-cy="image-preview"]').should('be.visible');
    cy.get('[data-cy="image-preview-display"]').should('have.attr', 'src').and('contain', 'blob:');

    // 5) Enviar
    cy.get('[data-cy="reply-submit"]').click();

    // 6) Validar FormData no intercept
    cy.wait('@postCommentWithImage').then((interception) => {
      // Validamos se o que foi enviado é um FormData (Multipart)
      const { request } = interception;
      expect(request.headers['content-type']).to.include('multipart/form-data');
    });

    // 7) Validar renderização na lista
    cy.get('[data-cy="comment-item"]').first().within(() => {
      cy.get('[data-cy="comment-content"]').should('contain', 'Olha essa foto!');
      cy.get('[data-cy="comment-media"]')
        .should('have.attr', 'src')
        .and('contain', 'test.png');
      // Garantir que o tamanho está correto conforme ajustamos (200x150)
      cy.get('[data-cy="comment-media"]')
        .should('have.css', 'width', '200px')
        .and('have.css', 'height', '150px');
    });
  });

  it('Deve permitir remover a imagem selecionada e trocar por um GIF', () => {
    cy.intercept('GET', 'https://api.giphy.com/v1/gifs/**', {
      body: { data: [{ id: '1', images: { fixed_height: { url: 'https://media.giphy.com/gif.gif' }, fixed_height_small: { url: 'https://media.giphy.com/gif.gif' } } }] }
    }).as('giphyFetch');

    visitAuthed('/');
    cy.get('[data-cy="comment-button"]').first().click({ force: true });

    // 1. Seleciona Imagem
    cy.get('[data-cy="file-input"]').selectFile({
      contents: Cypress.Buffer.from('test'),
      fileName: 'image.png'
    }, { force: true });
    cy.get('[data-cy="image-preview"]').should('exist');

    // 2. Remove Imagem
    cy.get('[data-cy="remove-image"]').click();
    cy.get('[data-cy="image-preview"]').should('not.exist');

    // 3. Seleciona GIF (para garantir que um não quebra o outro)
    cy.get('[data-cy="open-gif"]').click();
    cy.wait('@giphyFetch');
    cy.get('[data-cy="gif-item"]').first().click({ force: true });
    cy.get('[data-cy="gif-preview"]').should('exist');
    cy.get('[data-cy="reply-submit"]').should('not.be.disabled');
  });
})
