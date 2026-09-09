# New "Pale garden" world theme choice.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_rename_warm_ocean'),
    ]

    operations = [
        migrations.AlterField(
            model_name='world',
            name='theme',
            field=models.CharField(choices=[('sulfur_caves', 'Сіркові печери'), ('amethyst', 'Аметистовий кристал'), ('trial_palace', 'Палац випробувань'), ('dappled_forest', 'Строкатий ліс'), ('cherry_grove', 'Вишнева роща'), ('skies', 'Небеса'), ('desert', 'Пустеля'), ('warm_ocean', 'Океан'), ('pale_garden', 'Блідий сад')], default='sulfur_caves', max_length=20),
        ),
    ]
