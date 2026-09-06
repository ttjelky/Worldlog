from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from .models import Membership, Notification


@override_settings(
    ALLOWED_HOSTS=['testserver'],
    REST_FRAMEWORK={
        **__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    },
)
class WorldPermissionsTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='permowner', email='o@test.com', password='Str0ng!Pass1'
        )
        self.viewer = User.objects.create_user(
            username='permviewer', email='v@test.com', password='Str0ng!Pass1'
        )
        self.stranger = User.objects.create_user(
            username='permstranger', email='s@test.com', password='Str0ng!Pass1'
        )
        self.world = self.owner.worlds.create(name='Світ прав', is_public=True)
        Membership.objects.create(
            world=self.world, user=self.viewer, role='viewer', status='active'
        )
        self.location = self.world.locations.create(
            name='Печера', x=0, y=0, z=0, category='other'
        )
        self.client = APIClient()

    def auth(self, user):
        self.client.force_authenticate(user)

    def todos_url(self):
        return f'/api/worlds/{self.world.pk}/todos/'

    def shots_url(self):
        return f'/api/worlds/{self.world.pk}/locations/{self.location.pk}/screenshots/'

    def access_url(self):
        return f'/api/worlds/{self.world.pk}/access-requests/'

    def test_viewer_cannot_create_todo(self):
        self.auth(self.viewer)
        resp = self.client.post(self.todos_url(), {'title': 'Хак'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_stranger_cannot_create_todo(self):
        self.auth(self.stranger)
        resp = self.client.post(self.todos_url(), {'title': 'Хак'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_create_todo(self):
        self.auth(self.owner)
        resp = self.client.post(self.todos_url(), {'title': 'Легально'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_viewer_cannot_upload_screenshot(self):
        self.auth(self.viewer)
        resp = self.client.post(self.shots_url(), {}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_delete_world(self):
        self.auth(self.viewer)
        resp = self.client.delete(f'/api/worlds/{self.world.pk}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_patch_world(self):
        self.auth(self.viewer)
        resp = self.client.patch(
            f'/api/worlds/{self.world.pk}/', {'name': 'Хак'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_access_request_flow(self):
        # Створення + сповіщення власнику з прив'язкою заявки
        self.auth(self.stranger)
        resp = self.client.post(self.access_url(), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        access_id = resp.data['id']

        notif = Notification.objects.filter(
            user=self.owner,
            notification_type=Notification.Type.WORLD_ACCESS_REQUEST,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.access_request_id, access_id)
        self.assertEqual(notif.from_user_id, self.stranger.id)

        # Дубль — 400, а не 500
        resp = self.client.post(self.access_url(), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Чергу бачить лише власник
        self.auth(self.owner)
        resp = self.client.get(self.access_url())
        self.assertEqual(len(resp.data), 1)
        self.auth(self.stranger)
        resp = self.client.get(self.access_url())
        self.assertEqual(resp.data, [])

        # Схвалення за id заявки створює membership
        self.auth(self.owner)
        resp = self.client.post(f'/api/world-access-requests/{access_id}/accept/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Membership.objects.filter(
                world=self.world, user=self.stranger, status='active'
            ).exists()
        )

    def test_owner_cannot_request_own_world(self):
        self.auth(self.owner)
        resp = self.client.post(self.access_url(), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
