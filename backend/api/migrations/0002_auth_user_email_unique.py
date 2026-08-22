from django.db import migrations


def add_email_unique(apps, schema_editor):
    if schema_editor.connection.vendor == 'sqlite':
        schema_editor.execute(
            'CREATE UNIQUE INDEX auth_user_email_unique ON auth_user (email) WHERE email != ""'
        )
    else:
        schema_editor.execute(
            'ALTER TABLE auth_user ADD CONSTRAINT auth_user_email_unique UNIQUE (email)'
        )


def remove_email_unique(apps, schema_editor):
    if schema_editor.connection.vendor == 'sqlite':
        schema_editor.execute('DROP INDEX IF EXISTS auth_user_email_unique')
    else:
        schema_editor.execute('ALTER TABLE auth_user DROP CONSTRAINT auth_user_email_unique')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(add_email_unique, remove_email_unique),
    ]
