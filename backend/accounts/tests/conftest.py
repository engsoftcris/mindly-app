import pytest
from rest_framework.test import APIClient

@pytest.fixture
def api_client():
    """
    Custom fixture to provide a Rest Framework APIClient.
    This resolves the 'fixture not found' error.
    """
    return APIClient()