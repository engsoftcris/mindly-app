from accounts.models import Post
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch

User = get_user_model()

@pytest.mark.django_db
def test_user_creation_defaults_to_pending_status():
    user = User.objects.create_user(
        username="testuser", full_name="Test User", password="password123", email="test@example.com"
    )
    assert user.image_status == "PENDING"
    assert user.is_active is True

@pytest.mark.django_db
def test_post_content_length_validation():
    user = User.objects.create_user(username="tester2", email="test2@test.com")
    long_text = "x" * 281
    post = Post(user=user, content=long_text)
    with pytest.raises(ValidationError):
        post.full_clean() 
        post.save()

@pytest.mark.django_db
def test_post_video_triggers_ffmpeg_processing():
    """
    Ensures that saving a post with a video triggers the FFmpeg subprocess.
    """
    user = User.objects.create_user(username="tester", email="test@test.com")
    video_file = SimpleUploadedFile("my_video.mp4", b"fake-data", content_type="video/mp4")
    
    with patch("accounts.models.subprocess.run") as mock_run:
        Post.objects.create(user=user, content="Nice video!", media=video_file)
        
        # Verify that FFmpeg was called
        assert mock_run.called
        # Check if it was called with the '-t 15' argument
        args, _ = mock_run.call_args
        assert '-t' in args[0]
        assert '15' in args[0]