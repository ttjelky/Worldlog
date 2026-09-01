from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class AuthRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'

    def test_successful_registration(self):
        resp = self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', resp.data)
        self.assertEqual(resp.data['username'], 'testuser')
        self.assertEqual(resp.data['email'], 'test@example.com')
        self.assertNotIn('password', resp.data)

    def test_username_normalized_lowercase(self):
        self.client.post(self.register_url, {
            'username': 'TestUser',
            'email': 'test@example.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        user = User.objects.get(username='testuser')
        self.assertEqual(user.username, 'testuser')

    def test_email_normalized_lowercase(self):
        self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'TEST@EXAMPLE.COM',
            'password': 'Str0ng!Pass1',
        }, format='json')
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')

    def test_email_required(self):
        resp = self.client.post(self.register_url, {
            'username': 'noemail',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', resp.data)

    def test_duplicate_email_rejected(self):
        self.client.post(self.register_url, {
            'username': 'user1',
            'email': 'same@example.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        resp = self.client.post(self.register_url, {
            'username': 'user2',
            'email': 'same@example.com',
            'password': 'Str0ng!Pass2',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', resp.data)

    def test_duplicate_email_case_insensitive(self):
        self.client.post(self.register_url, {
            'username': 'user1',
            'email': 'Test@Example.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        resp = self.client.post(self.register_url, {
            'username': 'user2',
            'email': 'test@example.com',
            'password': 'Str0ng!Pass2',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_username_rejected(self):
        self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'a@example.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        resp = self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'b@example.com',
            'password': 'Str0ng!Pass2',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', resp.data)

    def test_duplicate_username_case_insensitive(self):
        self.client.post(self.register_url, {
            'username': 'TestUser',
            'email': 'a@example.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        resp = self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'b@example.com',
            'password': 'Str0ng!Pass2',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_too_short(self):
        resp = self.client.post(self.register_url, {
            'username': 'shortpass',
            'email': 'short@test.com',
            'password': '123',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', resp.data)

    def test_password_not_in_response(self):
        resp = self.client.post(self.register_url, {
            'username': 'secure',
            'email': 'secure@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertNotIn('password', resp.data)

    def test_username_too_short(self):
        resp = self.client.post(self.register_url, {
            'username': 'ab',
            'email': 'ab@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_username_invalid_characters(self):
        resp = self.client.post(self.register_url, {
            'username': 'user name!',
            'email': 'spaces@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class AuthLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.login_url = '/api/auth/token/'
        User.objects.create_user(
            username='testuser', email='test@example.com', password='TestPass123!'
        )

    def test_successful_login(self):
        resp = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_login_case_insensitive_email(self):
        resp = self.client.post(self.login_url, {
            'email': 'TEST@EXAMPLE.COM',
            'password': 'TestPass123!',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_login_wrong_password(self):
        resp = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'WrongPass123!',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_email(self):
        resp = self.client.post(self.login_url, {
            'email': 'nobody@example.com',
            'password': 'TestPass123!',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_empty_credentials(self):
        resp = self.client.post(self.login_url, {
            'email': '',
            'password': '',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class AuthLogoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User.objects.create_user(
            username='testuser', email='test@example.com', password='TestPass123!'
        )
        resp = self.client.post('/api/auth/token/', {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }, format='json')
        self.access = resp.data['access']
        self.refresh = resp.data['refresh']

    def test_logout_invalidates_refresh_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        resp = self.client.post('/api/auth/logout/', {'refresh': self.refresh}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_205_RESET_CONTENT)

        resp2 = self.client.post('/api/auth/token/refresh/', {'refresh': self.refresh}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_refresh(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        resp = self.client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_requires_auth(self):
        resp = self.client.post('/api/auth/logout/', {'refresh': 'bad'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class UserProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='TestPass123!'
        )
        resp = self.client.post('/api/auth/token/', {
            'email': 'test@example.com', 'password': 'TestPass123!'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def test_get_own_profile(self):
        resp = self.client.get('/api/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'testuser')
        self.assertEqual(resp.data['email'], 'test@example.com')

    def test_update_profile_requires_current_password(self):
        resp = self.client.patch('/api/me/', {
            'username': 'newname',
            'current_password': 'wrongpass',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_profile_with_correct_password(self):
        resp = self.client.patch('/api/me/', {
            'email': 'new@example.com',
            'current_password': 'TestPass123!',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'new@example.com')

    def test_update_password(self):
        resp = self.client.patch('/api/me/', {
            'current_password': 'TestPass123!',
            'new_password': 'NewPass456!',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass456!'))

    def test_duplicate_email_on_update(self):
        User.objects.create_user(username='other', email='taken@example.com', password='Pass123!')
        resp = self.client.patch('/api/me/', {
            'email': 'taken@example.com',
            'current_password': 'TestPass123!',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_not_in_me_response(self):
        resp = self.client.get('/api/me/')
        self.assertNotIn('password', resp.data)


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_then_login(self):
        reg = self.client.post('/api/auth/register/', {
            'username': 'flowuser',
            'email': 'flow@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(reg.status_code, status.HTTP_201_CREATED)

        login = self.client.post('/api/auth/token/', {
            'email': 'flow@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')
        me = self.client.get('/api/me/')
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data['username'], 'flowuser')

    def test_token_refresh_flow(self):
        self.client.post('/api/auth/register/', {
            'username': 'refreshuser',
            'email': 'refresh@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')

        login = self.client.post('/api/auth/token/', {
            'email': 'refresh@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')

        refresh_resp = self.client.post('/api/auth/token/refresh/', {
            'refresh': login.data['refresh'],
        }, format='json')
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_resp.data)

    def test_me_requires_auth(self):
        resp = self.client.get('/api/me/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_rejects_sql_injection(self):
        resp = self.client.post('/api/auth/register/', {
            'username': "admin'--",
            'email': 'sqli@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_xss_in_username(self):
        resp = self.client.post('/api/auth/register/', {
            'username': '<script>alert(1)</script>',
            'email': 'xss@test.com',
            'password': 'Str0ng!Pass1',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class RelationshipTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='reluser', email='rel@test.com', password='Str0ng!Pass1'
        )
        self.world = self.user.worlds.create(name='Світ зв\'язків')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.location = self.world.locations.create(name='Печера', x=1, y=1, z=1)
        self.wiki = self.world.wiki_pages.create(title='Дракон', page_type='character')
        self.note = self.world.notes.create(title='Легенда')

    def url(self, path=''):
        return f'/api/worlds/{self.world.pk}/relationships/{path}'

    def test_create_relationship_between_any_types(self):
        resp = self.client.post(self.url(), {
            'source_type': 'wiki_page',
            'source_id': self.wiki.pk,
            'target_type': 'location',
            'target_id': self.location.pk,
            'label': 'мешкає в',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['source_name'], 'Дракон')
        self.assertEqual(resp.data['target_name'], 'Печера')

    def test_create_note_to_project(self):
        project = self.world.projects.create(title='Будівництво')
        resp = self.client.post(self.url(), {
            'source_type': 'note',
            'source_id': self.note.pk,
            'target_type': 'project',
            'target_id': project.pk,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['target_name'], 'Будівництво')

    def test_filtering_by_source_and_target(self):
        self.world.relationships.create(
            source_type='wiki_page',
            source_id=self.wiki.pk,
            target_type='location',
            target_id=self.location.pk,
        )
        self.world.relationships.create(
            source_type='note',
            source_id=self.note.pk,
            target_type='location',
            target_id=self.location.pk,
        )

        resp = self.client.get(self.url(), {
            'source_type': 'wiki_page', 'source_id': self.wiki.pk,
        })
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['target_name'], 'Печера')

        resp = self.client.get(self.url(), {
            'target_type': 'location', 'target_id': self.location.pk,
        })
        self.assertEqual(len(resp.data), 2)

    def test_rejects_link_to_missing_entity(self):
        resp = self.client.post(self.url(), {
            'source_type': 'wiki_page',
            'source_id': self.wiki.pk,
            'target_type': 'location',
            'target_id': 99999,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_link_to_other_world_entity(self):
        other_world = self.user.worlds.create(name='Інший світ')
        other_loc = other_world.locations.create(name='Чужак', x=0, y=0, z=0)
        resp = self.client.post(self.url(), {
            'source_type': 'wiki_page',
            'source_id': self.wiki.pk,
            'target_type': 'location',
            'target_id': other_loc.pk,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_self_link(self):
        resp = self.client.post(self.url(), {
            'source_type': 'wiki_page',
            'source_id': self.wiki.pk,
            'target_type': 'wiki_page',
            'target_id': self.wiki.pk,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_entities_endpoint_lists_all_types_and_searches(self):
        resp = self.client.get('/api/worlds/{}/entities/'.format(self.world.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        types = {e['type'] for e in resp.data}
        self.assertIn('wiki_page', types)
        self.assertIn('location', types)
        self.assertIn('note', types)

        resp = self.client.get(
            '/api/worlds/{}/entities/'.format(self.world.pk), {'q': 'ракон'}
        )
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['name'], 'Дракон')

        resp = self.client.get(
            '/api/worlds/{}/entities/'.format(self.world.pk),
            {'exclude_type': 'wiki_page', 'exclude_id': self.wiki.pk},
        )
        self.assertNotIn('Дракон', [e['name'] for e in resp.data])


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class WikiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='wikiuser', email='wiki@test.com', password='Str0ng!Pass1'
        )
        self.world = self.user.worlds.create(name='Світ вікі')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_wiki_page_roundtrip_with_infobox(self):
        resp = self.client.post('/api/worlds/{}/wiki/'.format(self.world.pk), {
            'title': 'За́снована',
            'page_type': 'character',
            'emoji': '🧙',
            'infobox': {'race': 'Ельф', 'status': 'alive', 'faction': 'Орден Світла'},
            'tags': 'герой, рада',
            'world_date': 'Рік 3',
            'content': 'Згадка про [[Місто]]',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['infobox']['race'], 'Ельф')
        self.assertEqual(resp.data['emoji'], '🧙')
        self.assertEqual(resp.data['tags'], 'герой, рада')

    def test_graph_endpoint_builds_nodes_and_edges(self):
        a = self.world.wiki_pages.create(title='Дракон', page_type='character')
        b = self.world.wiki_pages.create(title='Печера', page_type='location')
        a.content = 'Дракон живе в [[Печера]]'
        a.save()
        self.world.relationships.create(
            source_type='wiki_page',
            source_id=b.pk,
            target_type='wiki_page',
            target_id=a.pk,
            label='ворог',
        )

        resp = self.client.get('/api/worlds/{}/wiki/graph/'.format(self.world.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['nodes']), 2)
        self.assertEqual(len(resp.data['edges']), 2)
        kinds = {e['kind'] for e in resp.data['edges']}
        self.assertEqual(kinds, {'link', 'rel'})

    def test_graph_ignores_broken_links(self):
        self.world.wiki_pages.create(title='Дракон', page_type='character')
        self.world.wiki_pages.create(
            title='Сторінка', content='Згадка про [[Невідома]]', page_type='custom'
        )
        resp = self.client.get('/api/worlds/{}/wiki/graph/'.format(self.world.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['edges'], [])
