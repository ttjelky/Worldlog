import datetime
import django.db.models.deletion
from django.db import migrations, models


def forwards(apps, schema_editor):
    HistoryEvent = apps.get_model('api', 'HistoryEvent')
    World = apps.get_model('api', 'World')
    world_starts = {w.id: w.start_date for w in World.objects.all()}
    for event in HistoryEvent.objects.all():
        start = world_starts.get(event.world_id)
        if start and event.date:
            event.game_day = (event.date - start).days + 1
        else:
            event.game_day = None
        event.save(update_fields=['game_day'])


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_alter_userprofile_avatar'),
    ]

    operations = [
        migrations.CreateModel(
            name='Epoch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('start_date', models.DateField(auto_now_add=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('world', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='epochs', to='api.world')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.AddField(
            model_name='historyevent',
            name='epoch',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='api.epoch'),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='coord_x',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='coord_y',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='coord_z',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='event_type',
            field=models.CharField(choices=[('battle', 'Битва'), ('building', 'Будівництво'), ('death', 'Смерть'), ('boss', 'Бос'), ('discovery', 'Відкриття'), ('achievement', 'Досягнення'), ('other', 'Інше')], default='other', max_length=20),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='game_day',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='history_events/'),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='is_important',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='historyevent',
            name='participants',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='historyevent',
            name='date',
            field=models.DateField(default=datetime.date.today),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='historyevent',
            name='category',
        ),
    ]
