# Bookmark pinning for the bookmarks card.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_cards_improvements'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookmark',
            name='is_pinned',
            field=models.BooleanField(default=False),
        ),
    ]
