# Generated manually: per-user idea votes to prevent unlimited voting.

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0028_friendship_sender'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='IdeaVote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('idea', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='idea_votes', to='api.idea')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='idea_votes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('idea', 'user')},
            },
        ),
    ]
