import pytest
from django.urls import reverse, NoReverseMatch
from rest_framework import status

@pytest.mark.django_db
class TestProfileConnectionsIntegration:
    def get_url(self, action_name, pk=None):
        names = [f'profile-{action_name}', f'accounts:profile-{action_name}']
        for name in names:
            try:
                return reverse(name, kwargs={'pk': pk}) if pk else reverse(name)
            except NoReverseMatch:
                continue
        raise NoReverseMatch(f"Rota {action_name} não encontrada.")

    def test_connections_returns_user_objects_shape(self, auth_client, user_b_profile):
        """
        TAL-47: Endpoints de connections retornam lista de OBJETOS (não IDs),
        sustentando a UI de modal/página de seguidores/seguindo.
        """
        url = self.get_url("connections", pk=user_b_profile.id)

        res = auth_client.get(url, {"type": "followers"})
        assert res.status_code == status.HTTP_200_OK
        assert isinstance(res.data, list)

        # pode ser vazio (ok)
        if len(res.data) == 0:
            return

        first = res.data[0]
        assert "profile_id" in first
        assert "username" in first
        assert "display_name" in first
        assert "profile_picture" in first

        # garante que não é só ID puro
        assert not isinstance(first, (str, int))

    def test_follow_unfollow_updates_connections_lists(self, auth_client, user, user_b_profile):
        """
        TAL-47: Follow/unfollow refletido em connections (followers/following).
        """
        target_profile = user_b_profile
        follow_url = self.get_url("follow-toggle", pk=target_profile.id)

        # seguir
        r1 = auth_client.post(follow_url)
        assert r1.status_code in (200, 201)
        assert r1.data.get("is_following") is True

        # followers do target deve conter o user atual
        followers_url = self.get_url("connections", pk=target_profile.id)
        followers_res = auth_client.get(followers_url, {"type": "followers"})
        assert followers_res.status_code == 200
        assert any(u["username"] == user.username for u in followers_res.data)

        # following do user atual (via profile dele)
        my_profile_id = user.profile.id
        following_url = self.get_url("connections", pk=my_profile_id)
        following_res = auth_client.get(following_url, {"type": "following"})
        assert following_res.status_code == 200
        assert any(u["profile_id"] == str(target_profile.id) or u["username"] == target_profile.user.username for u in following_res.data)

        # unfollow
        r2 = auth_client.post(follow_url)
        assert r2.status_code == 200
        assert r2.data.get("is_following") is False
    
    def test_connections_requires_auth(self, api_client, user_b_profile):
        url = self.get_url("connections", pk=user_b_profile.id)
        res = api_client.get(url, {"type": "followers"})
        assert res.status_code in (401, 403)