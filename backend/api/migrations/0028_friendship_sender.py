# Generated manually: track friend request sender (sorted pair keeps uniqueness).

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_sender(apps, schema_editor):
    Friendship = apps.get_model('api', 'Friendship')
    # Без історії напрямку вважаємо відправником user_a (стара евристика accept/reject).
    Friendship.objects.filter(sender__isnull=True).update(sender=models.F('user_a'))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0027_project_due_date_todoitem_order'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='friendship',
            name='sender',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='sent_friendships',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_sender, noop),
    ]
