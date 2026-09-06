from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_rename_amethyst_theme'),
    ]

    operations = [
        migrations.AlterField(
            model_name='world',
            name='theme',
            field=models.CharField(choices=[('sulfur_caves', 'Сіркові печери'), ('amethyst', 'Аметистовий кристал'), ('trial_palace', 'Палац випробувань'), ('honeycomb', 'Медові соти'), ('cherry_grove', 'Вишнева роща')], default='sulfur_caves', max_length=20),
        ),
    ]
