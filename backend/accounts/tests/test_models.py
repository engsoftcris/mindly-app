from accounts.models import Post
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()


@pytest.mark.django_db
def test_user_creation_defaults_to_pending_status():
    # Criamos um usuário sem especificar o status
    user = User.objects.create_user(
        username="testuser", full_name="Test User", password="password123", email="test@example.com"
    )

    # Verificamos se o status é PENDING
    assert user.image_status == "PENDING"
    assert user.is_active is True

@pytest.mark.django_db
def test_post_content_length_validation():
    """
    Ensures the model enforces the 280 character limit.
    """
    user = User.objects.create_user(username="tester2", email="test2@test.com")
    long_text = "x" * 281

    post = Post(user=user, content=long_text)

    # This 'with' block acts like a trap. 
    # It waits for the ValidationError to happen inside it.
    with pytest.raises(ValidationError):
        post.full_clean()  # <--- YOU NEED THIS LINE HERE!
        post.save()

@pytest.mark.django_db
def test_post_video_duration_validation_exceeds_limit(monkeypatch):
    """
    Ensures that a video longer than 15 seconds raises a ValidationError.
    """
    # 1. Setup: Create a user and a dummy file
    user = User.objects.create_user(username="tester", email="test@test.com")
    video_file = SimpleUploadedFile("too_long.mp4", b"fake-data", content_type="video/mp4")
    
    # 2. Mocking MoviePy: We simulate a video that is 20 seconds long
    class MockVideo:
        def __init__(self, *args, **kwargs):
            self.duration = 20.0  # 20s is > 15s
        def close(self):
            pass

    # This replaces the real VideoFileClip with our MockVideo during this test
    monkeypatch.setattr("accounts.models.VideoFileClip", MockVideo)
    
    # 3. Execution & Assertion:
    post = Post(user=user, content="Check out this long video", media=video_file)
    
    with pytest.raises(ValidationError) as excinfo:
        post.full_clean()  # This triggers the validators in the model
        
    assert "Maximum allowed is 15 seconds" in str(excinfo.value)