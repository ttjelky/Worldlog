# Продовження 0030_cleanup_rolled_back_features: прибираємо залишки
# відкоченої invite-системи, які 0030 пропустила.
#
# Колонки api_worldaccessrequest.invited_by_id та api_worldaccessrequest.role
# (NOT NULL без дефолту) лишилися в dev-БД від видалених міграцій, а в
# моделях/файлах міграцій їх немає. Через NOT NULL будь-який INSERT
# (POST /worlds/:id/access-requests/) падав з IntegrityError, який в'ю
# маскувала під 400 'Access request already exists.'.
# Інші колонки/рядки не чіпаємо — дані зберігаються.

from django.db import migrations


def _sqlite_drop_column(cursor, table, column):
    cols = [row[1] for row in cursor.execute(
        'PRAGMA table_info(%s)' % table
    ).fetchall()]
    if column not in cols:
        return
    for idx in cursor.execute('PRAGMA index_list(%s)' % table).fetchall():
        idx_name = idx[1]
        idx_cols = [row[2] for row in cursor.execute(
            'PRAGMA index_info(%s)' % idx_name
        ).fetchall()]
        if column in idx_cols:
            cursor.execute('DROP INDEX IF EXISTS %s' % idx_name)
    cursor.execute('ALTER TABLE %s DROP COLUMN %s' % (table, column))


def forwards(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        if conn.vendor == 'sqlite':
            _sqlite_drop_column(cursor, 'api_worldaccessrequest', 'invited_by_id')
            _sqlite_drop_column(cursor, 'api_worldaccessrequest', 'role')
        elif conn.vendor == 'postgresql':
            cursor.execute('ALTER TABLE api_worldaccessrequest DROP COLUMN IF EXISTS invited_by_id')
            cursor.execute('ALTER TABLE api_worldaccessrequest DROP COLUMN IF EXISTS role')


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_userprofile_cover'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
