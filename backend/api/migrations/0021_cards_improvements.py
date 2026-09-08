# Generated for WorldLog cards improvement: pinned notes, idea voting, player status, etc.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_rename_honeycomb_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='world',
            name='game_version',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='world',
            name='server_address',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='player',
            name='status',
            field=models.CharField(choices=[('alive', 'Alive'), ('dead', 'Dead'), ('missing', 'Missing')], default='alive', max_length=10),
        ),
        migrations.AddField(
            model_name='note',
            name='is_pinned',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='note',
            name='color',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='bookmark',
            name='tags',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='idea',
            name='status',
            field=models.CharField(choices=[('open', 'Open'), ('accepted', 'Accepted'), ('rejected', 'Rejected')], default='open', max_length=10),
        ),
        migrations.AddField(
            model_name='idea',
            name='votes',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
