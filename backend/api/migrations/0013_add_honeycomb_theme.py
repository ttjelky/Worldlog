from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_add_epoch_expand_history'),
    ]

    operations = [
        migrations.AlterField(
            model_name='world',
            name='theme',
            field=models.CharField(choices=[('sulfur_caves', 'Сіркові печери'), ('amethyst', 'Аметистова'), ('trial_palace', 'Палац випробувань'), ('honeycomb', 'Медові соти')], default='sulfur_caves', max_length=20),
        ),
    ]
