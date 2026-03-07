import pytest
import threading
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

@pytest.mark.django_db(transaction=True)
class TestPostConcurrency:
    
    def test_simultaneous_post_uploads_tal37(self, auth_client):
        # TAL-37: Usamos 'patch' para evitar que o teste tente subir arquivos para o S3 real
        # Substitua 'sua_app.models.Post.media.storage.save' pelo caminho correto se necessário
        with patch('django.core.files.storage.Storage.save', return_value='test.gif'):
            url = reverse('post-list')
            num_requests = 20
            results = []
            small_gif = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b'

            def make_post():
                payload = {"title": "Concorrência", "content": "TAL-37", "media": SimpleUploadedFile("test.gif", small_gif, "image/gif")}
                try:
                    # O auth_client deve estar autenticado para evitar 401/403
                    response = auth_client.post(url, payload, format='multipart')
                    results.append(response.status_code)
                except Exception as e:
                    results.append(str(e))

            threads = [threading.Thread(target=make_post) for _ in range(num_requests)]
            for t in threads: t.start()
            for t in threads: t.join()

            # Validações do DoD
            assert len(results) == num_requests
            assert all(res == status.HTTP_201_CREATED for res in results), f"Status retornados: {results}"
            print(f"\n✅ TAL-37: {num_requests} postagens simuladas com sucesso!")