from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_add_desert_theme'),
    ]

    operations = [
        migrations.AlterField(
            model_name='world',
            name='theme',
            field=models.CharField(choices=[('sulfur_caves', 'Сіркові печери'), ('amethyst', 'Аметистовий кристал'), ('trial_palace', 'Палац випробувань'), ('honeycomb', 'Строкатий ліс'), ('cherry_grove', 'Вишнева роща'), ('skies', 'Небеса'), ('desert', 'Пустеля')], default='sulfur_caves', max_length=20),
        ),
    ]
