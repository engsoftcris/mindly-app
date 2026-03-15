from typing import TYPE_CHECKING  # Standard library primeiro

import factory  # Third party depois
from django.contrib.auth import get_user_model

# Se estiver usando um Custom User, importe a classe real aqui dentro
if TYPE_CHECKING:
    from accounts.models import User as UserType
else:
    UserType = object

User = get_user_model()


# Usamos UserType (que o Mypy entende como classe) no genérico
class UserFactory(factory.django.DjangoModelFactory["UserType"]):
    class Meta:
        model = User

    username = factory.Faker("user_name")
    email = factory.Faker("email")
    image_status = "PENDING"
    is_banned = False
    ban_reason = ""
