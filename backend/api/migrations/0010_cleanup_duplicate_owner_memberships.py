from django.db import migrations


def cleanup_owner_memberships(apps, schema_editor):
    Membership = apps.get_model('api', 'Membership')
    World = apps.get_model('api', 'World')

    for world in World.objects.all():
        Membership.objects.filter(
            world=world,
            user_id=world.owner_id,
        ).delete()


def reverse_cleanup(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_alter_notification_notification_type_and_more'),
    ]

    operations = [
        migrations.RunPython(cleanup_owner_memberships, reverse_cleanup),
    ]
