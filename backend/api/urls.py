from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    HistoryEventViewSet,
    LocationScreenshotViewSet,
    LocationViewSet,
    MembershipViewSet,
    PlayerViewSet,
    RegisterView,
    TodoViewSet,
    UserDetailView,
    WorldViewSet,
)

router = DefaultRouter()
router.register('worlds', WorldViewSet, basename='world')
router.register(
    r'worlds/(?P<world_id>\d+)/players', PlayerViewSet, basename='world-player'
)
router.register(
    r'worlds/(?P<world_id>\d+)/locations',
    LocationViewSet,
    basename='world-location',
)
router.register(
    r'worlds/(?P<world_id>\d+)/locations/(?P<location_id>\d+)/screenshots',
    LocationScreenshotViewSet,
    basename='location-screenshot',
)
router.register(
    r'worlds/(?P<world_id>\d+)/todos', TodoViewSet, basename='world-todo'
)
router.register(
    r'worlds/(?P<world_id>\d+)/history', HistoryEventViewSet, basename='world-history'
)
router.register(
    r'worlds/(?P<world_id>\d+)/memberships', MembershipViewSet, basename='world-membership'
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='me'),
] + router.urls