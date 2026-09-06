from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_add_skies_theme'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='access_request',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notifications', to='api.worldaccessrequest'),
        ),
    ]
