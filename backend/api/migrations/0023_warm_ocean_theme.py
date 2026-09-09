# New "Warm ocean" world theme choice.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_bookmark_is_pinned'),
    ]

    operations = [
        migrations.AlterField(
            model_name='world',
            name='theme',
            field=models.CharField(choices=[('sulfur_caves', 'Сіркові печери'), ('amethyst', 'Аметистовий кристал'), ('trial_palace', 'Палац випробувань'), ('dappled_forest', 'Строкатий ліс'), ('cherry_grove', 'Вишнева роща'), ('skies', 'Небеса'), ('desert', 'Пустеля'), ('warm_ocean', 'Теплий океан')], default='sulfur_caves', max_length=20),
        ),
    ]
