from django.db import migrations, models


def forwards(apps, schema_editor):
    World = apps.get_model('api', 'World')
    World.objects.filter(theme='honeycomb').update(theme='dappled_forest')


def backwards(apps, schema_editor):
    World = apps.get_model('api', 'World')
    World.objects.filter(theme='dappled_forest').update(theme='honeycomb')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_rename_honeycomb_theme'),
    ]

    operations = [
        migrations.AlterField(
            model_name='world',
            name='theme',
            field=models.CharField(choices=[('sulfur_caves', 'Сіркові печери'), ('amethyst', 'Аметистовий кристал'), ('trial_palace', 'Палац випробувань'), ('dappled_forest', 'Строкатий ліс'), ('cherry_grove', 'Вишнева роща'), ('skies', 'Небеса'), ('desert', 'Пустеля')], default='sulfur_caves', max_length=20),
        ),
        migrations.RunPython(forwards, backwards),
    ]
