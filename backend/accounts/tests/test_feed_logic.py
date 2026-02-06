import pytest
from django.urls import reverse
from rest_framework import status
from accounts.models import Post, User

@pytest.mark.django_db
class TestHybridFeed:
    def test_feed_only_shows_followed_users_posts(self, api_client):
        # 1. Setup Users
        me = User.objects.create_user(username="me", email="me@test.com", password="123")
        friend = User.objects.create_user(username="friend", email="f@test.com", password="123")
        stranger = User.objects.create_user(username="stranger", email="s@test.com", password="123")

        # 2. 'Me' follows 'Friend' but NOT 'Stranger'
        me.following.add(friend)

        # 3. Create Posts
        Post.objects.create(user=friend, content="Post from my friend")
        Post.objects.create(user=stranger, content="Post from a stranger")

        # 4. Authenticate and Fetch Feed
        api_client.force_authenticate(user=me)
        url = reverse('network-feed')
        response = api_client.get(url)

        # 5. Assertions
        assert response.status_code == status.HTTP_200_OK
        # Should only have 1 post (from the friend)
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['author']['username'] == "friend"

    def test_feed_ordering_is_reverse_chronological(self, api_client):
        me = User.objects.create_user(username="me2", email="me2@test.com")
        friend = User.objects.create_user(username="friend2", email="f2@test.com")
        me.following.add(friend)

        # Create two posts with different timestamps
        Post.objects.create(user=friend, content="Old post")
        Post.objects.create(user=friend, content="New post")

        api_client.force_authenticate(user=me)
        response = api_client.get(reverse('network-feed'))

        # The first item in the list should be the "New post"
        assert response.data['results'][0]['content'] == "New post"