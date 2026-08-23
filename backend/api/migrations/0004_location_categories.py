from django.db import migrations, models


def forwards(apps, schema_editor):
    Location = apps.get_model('api', 'Location')
    Location.objects.filter(category='village').update(category='town')
    Location.objects.filter(category='temple').update(category='build')


def backwards(apps, schema_editor):
    Location = apps.get_model('api', 'Location')
    Location.objects.filter(category='town').update(category='village')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_add_world_is_public'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name='location',
            name='category',
            field=models.CharField(
                choices=[
                    ('farm', 'Farm'),
                    ('mine', 'Mine'),
                    ('town', 'Town'),
                    ('base', 'Base'),
                    ('structure', 'Structure'),
                    ('biome', 'Biome'),
                    ('build', 'Build'),
                    ('poi', 'Point of interest'),
                    ('other', 'Other'),
                ],
                default='other',
                max_length=20,
            ),
        ),
    ]
