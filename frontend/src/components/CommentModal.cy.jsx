import React from 'react';
import CommentModal from './CommentModal';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';

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
  };

  const mountWithAuth = (
    component,
    { user = { user_id: 999, username: 'me' }, loading = false } = {}
  ) => {
    cy.mount(
      <AuthContext.Provider value={{ user, loading }}>
        {component}
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    cy.stub(api, 'get').as('apiGet');
    cy.stub(api, 'post').as('apiPost');
  });

  const stubGetResolve = (payload) =>
    cy.get('@apiGet').then((stub) => stub.resolves(payload));

  const stubPostResolve = (payload) =>
    cy.get('@apiPost').then((stub) => stub.resolves(payload));

  it('não renderiza quando isOpen=false', () => {
    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={false}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    );
    cy.getByData('comment-modal').should('not.exist');
  });

  it('carrega comentários ao abrir e renderiza a lista', () => {
    stubGetResolve({
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
    });

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    );

    cy.get('@apiGet').should(
      'have.been.calledOnceWithExactly',
      '/comments/?post_id=123'
    );
    cy.getByData('comments-list').should('contain', 'Primeiro comentário');
  });

  it('desabilita Reply quando vazio e habilita ao digitar', () => {
    stubGetResolve({ data: [] });

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    );

    cy.getByData('reply-submit').should('be.disabled');
    cy.getByData('comment-input').type('Teste');
    cy.getByData('reply-submit').should('not.be.disabled');
  });

  it('envia comentário de texto corretamente', () => {
    stubGetResolve({ data: [] });

    const created = {
      id: 10,
      author_name: 'Eu',
      content: 'Meu reply',
      created_at: new Date().toISOString(),
      media_url: null,
    };
    stubPostResolve({ data: created });

    const onCommentAdded = cy.stub().as('onCommentAdded');

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={onCommentAdded}
      />
    );

    cy.getByData('comment-input').clear().type('Meu reply', { delay: 10 });
    cy.getByData('reply-submit').should('not.be.disabled').click();

    cy.get('@apiPost').should('have.been.calledOnce');
    cy.get('@apiPost').then((stub) => {
      const [url, formData, config] = stub.getCall(0).args;
      expect(url).to.eq('/comments/');
      expect(config).to.have.property('headers');
      expect(config.headers).to.have.property('Content-Type');

      expect(formData.get('post')).to.eq(String(123));
      expect(String(formData.get('content') || '').trim()).to.eq('Meu reply');
      expect(formData.get('is_gif')).to.eq(null);
      expect(formData.get('image')).to.eq(null);
    });

    cy.get('@onCommentAdded').should('have.been.calledOnce');
    cy.getByData('comments-list').should('contain', 'Meu reply');
  });

  it('envia comentário com Gift corretamente', () => {
    stubGetResolve({ data: [] });
    stubPostResolve({
      data: {
        id: 11,
        author_name: 'Eu',
        content: '',
        created_at: new Date().toISOString(),
        media_url: 'https://media.giphy.com/test-gift.gif',
        is_gif: true,
      },
    });

    cy.window().then((win) => {
      cy.stub(win, 'fetch').resolves({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: '1',
              images: {
                fixed_height: { url: 'https://media.giphy.com/test-gift.gif' },
                fixed_height_small: {
                  url: 'https://media.giphy.com/test-gift-small.gif',
                },
              },
            },
          ],
        }),
      });
    });

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    );

    cy.getByData('open-gif').click();
    cy.getByData('gif-item', { timeout: 10000 }).first().click({ force: true });
    cy.getByData('reply-submit').should('not.be.disabled').click();

    cy.get('@apiPost').should('have.been.calledOnce');
    cy.get('@apiPost').then((stub) => {
      const [url, formData] = stub.getCall(0).args;
      expect(url).to.eq('/comments/');
      expect(formData.get('post')).to.eq(String(123));
      expect(formData.get('media_url')).to.eq(
        'https://media.giphy.com/test-gift.gif'
      );
      expect(formData.get('is_gif')).to.eq('true');
      expect(formData.get('image')).to.eq(null);
    });
  });

  it('remove Gift corretamente', () => {
    stubGetResolve({ data: [] });

    cy.window().then((win) => {
      cy.stub(win, 'fetch').resolves({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: '1',
              images: {
                fixed_height: { url: 'https://media.giphy.com/test-gift.gif' },
                fixed_height_small: {
                  url: 'https://media.giphy.com/test-gift-small.gif',
                },
              },
            },
          ],
        }),
      });
    });

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    );

    cy.getByData('open-gif').click();
    cy.getByData('gif-item', { timeout: 10000 }).first().click({ force: true });
    cy.getByData('gif-preview').should('exist');
    cy.getByData('remove-gif').click();
    cy.getByData('gif-preview').should('not.exist');
    cy.getByData('reply-submit').should('be.disabled');
  });

  it('fecha modal corretamente', () => {
    stubGetResolve({ data: [] });
    const onClose = cy.stub().as('onClose');

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={onClose}
        onCommentAdded={cy.stub()}
      />
    );

    cy.getByData('comment-close').click();
    cy.get('@onClose').should('have.been.calledOnce');
  });

  it('envia comentário com imagem do PC corretamente', () => {
    stubGetResolve({ data: [] });
    const createdWithImage = {
      id: 12,
      author_name: 'Eu',
      content: 'Comentário com foto',
      created_at: new Date().toISOString(),
      image: 'https://supabase.co/storage/test_image.png',
      is_gif: false,
    };
    stubPostResolve({ data: createdWithImage });

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    );

    cy.get('@apiGet').should(
      'have.been.calledOnceWithExactly',
      '/comments/?post_id=123'
    );

    cy.getByData('file-input').selectFile(
      {
        contents: Cypress.Buffer.from('file contents'),
        fileName: 'test_image.png',
        mimeType: 'image/png',
        lastModified: Date.now(),
      },
      { force: true }
    );

    cy.getByData('image-preview', { timeout: 10000 }).should('exist');
    cy.getByData('comment-input').clear().type('Comentário com foto');
    cy.getByData('reply-submit').should('not.be.disabled').click();

    cy.get('@apiPost').should('have.been.calledOnce');
    cy.get('@apiPost').then((stub) => {
      const [url, formData, config] = stub.getCall(0).args;
      expect(url).to.eq('/comments/');
      expect(formData.get('post')).to.eq(String(123));
      expect(formData.get('content')).to.eq('Comentário com foto');
      expect(formData.get('image')).to.not.be.null;
      expect(formData.get('is_gif')).to.eq('false');
      expect(config.headers).to.have.property('Content-Type');
    });

    cy.getByData('comments-list').should('contain', 'Comentário com foto');
  });

  it('remove a imagem selecionada antes de enviar', () => {
    stubGetResolve({ data: [] });

    mountWithAuth(
      <CommentModal
        post={post}
        isOpen={true}
        onClose={cy.stub()}
        onCommentAdded={cy.stub()}
      />
    );

    cy.get('@apiGet').should(
      'have.been.calledOnceWithExactly',
      '/comments/?post_id=123'
    );

    cy.getByData('file-input').selectFile(
      {
        contents: Cypress.Buffer.from('test'),
        fileName: 'image.png',
        mimeType: 'image/png',
        lastModified: Date.now(),
      },
      { force: true }
    );

    cy.getByData('image-preview', { timeout: 10000 }).should('exist');
    cy.getByData('remove-image').click();
    cy.getByData('image-preview').should('not.exist');
    cy.getByData('reply-submit').should('be.disabled');
  });
});
