# Чистка за відкоченою міграцією 0030_audit_tags_comments_activity
# (фічі 10-ки відкатано, а файл міграції вже встиг застосуватись на dev-БД).
#
# Що лишилось у БД і чому ламає:
# - api_userprofile.email_verified NOT NULL без дефолту -> будь-який INSERT
#   профілю (get_or_create у PATCH /me/profile/) падає з IntegrityError 500.
# - orphan-таблиці api_tag/api_taggeditem/api_comment/api_activity та
#   created_by_id/updated_by_id колонки (nullable) — не ламають, але прибираємо,
#   щоб майбутні міграції з такими іменами не падали з "already exists".
# Ідемпотентно: на чистих БД (без слідів 0030) — no-op.

from django.db import migrations


AUDIT_TABLES = [
    'api_player',
    'api_location',
    'api_project',
    'api_todoitem',
    'api_epoch',
    'api_historyevent',
    'api_note',
    'api_bookmark',
    'api_idea',
    'api_wikipage',
    'api_relationship',
]

ORPHAN_TABLES = [
    'api_tag',
    'api_taggeditem',
    'api_comment',
    'api_activity',
]

GHOST_MIGRATION = '0030_audit_tags_comments_activity'


def _sqlite_drop_column(cursor, table, column):
    """DROP COLUMN разом із залежними індексами (інакше SQLite падає)."""
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
            _sqlite_drop_column(cursor, 'api_userprofile', 'email_verified')
            for table in AUDIT_TABLES:
                _sqlite_drop_column(cursor, table, 'created_by_id')
                _sqlite_drop_column(cursor, table, 'updated_by_id')
            for table in ORPHAN_TABLES:
                cursor.execute('DROP TABLE IF EXISTS %s' % table)
        elif conn.vendor == 'postgresql':
            cursor.execute('ALTER TABLE api_userprofile DROP COLUMN IF EXISTS email_verified')
            for table in AUDIT_TABLES:
                cursor.execute(
                    'ALTER TABLE %s DROP COLUMN IF EXISTS created_by_id, '
                    'DROP COLUMN IF EXISTS updated_by_id' % table
                )
            for table in ORPHAN_TABLES:
                cursor.execute('DROP TABLE IF EXISTS %s' % table)
        # Прибираємо рядок-привид видаленої міграції (якщо є).
        cursor.execute(
            "DELETE FROM django_migrations WHERE app = 'api' AND name = %s",
            [GHOST_MIGRATION],
        )


def backwards(apps, schema_editor):
    # Відкат не потрібен: операція лише прибирає сліди відкоченої міграції.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0029_ideavote'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
