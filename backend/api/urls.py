from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AcceptFriendRequestView,
    AcceptWorldAccessRequestView,
    BookmarkViewSet,
    CancelFriendRequestView,
    FriendshipViewSet,
    HistoryEventViewSet,
    IdeaViewSet,
    LocationScreenshotViewSet,
    LocationViewSet,
    LogoutView,
    MembershipViewSet,
    NoteViewSet,
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
    ParticipantSearchView,
    PlayerViewSet,
    ProfileUpdateView,
    ProjectViewSet,
    RejectFriendRequestView,
    RejectWorldAccessRequestView,
    RegisterView,
    RelationshipViewSet,
    SendFriendRequestView,
    TodoViewSet,
    UserDetailView,
    UserPublicProfileView,
    UserSearchView,
    WikiPageViewSet,
    WorldAccessRequestViewSet,
    WorldEntitiesView,
    WorldSearchView,
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
router.register(
    r'worlds/(?P<world_id>\d+)/notes', NoteViewSet, basename='world-note'
)
router.register(
    r'worlds/(?P<world_id>\d+)/projects', ProjectViewSet, basename='world-project'
)
router.register(
    r'worlds/(?P<world_id>\d+)/bookmarks', BookmarkViewSet, basename='world-bookmark'
)
router.register(
    r'worlds/(?P<world_id>\d+)/ideas', IdeaViewSet, basename='world-idea'
)
router.register(
    r'worlds/(?P<world_id>\d+)/wiki', WikiPageViewSet, basename='world-wiki'
)
router.register(
    r'worlds/(?P<world_id>\d+)/relationships', RelationshipViewSet, basename='world-relationship'
)
router.register('friends', FriendshipViewSet, basename='friendship')
router.register(
    r'worlds/(?P<world_id>\d+)/access-requests',
    WorldAccessRequestViewSet,
    basename='world-access-request',
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('me/', UserDetailView.as_view(), name='me'),
    path('me/profile/', ProfileUpdateView.as_view(), name='me-profile'),
    path('users/search/', UserSearchView.as_view(), name='user-search'),
    path('users/<str:username>/', UserPublicProfileView.as_view(), name='user-public-profile'),
    path('worlds/search/', WorldSearchView.as_view(), name='world-search'),
    path('worlds/<int:world_id>/entities/', WorldEntitiesView.as_view(), name='world-entities'),
    path('world-access-requests/<int:pk>/accept/', AcceptWorldAccessRequestView.as_view(), name='world-access-accept'),
    path('world-access-requests/<int:pk>/reject/', RejectWorldAccessRequestView.as_view(), name='world-access-reject'),
    path('friends/send/', SendFriendRequestView.as_view(), name='friend-send'),
    path('friends/<int:pk>/accept/', AcceptFriendRequestView.as_view(), name='friend-accept'),
    path('friends/<int:pk>/reject/', RejectFriendRequestView.as_view(), name='friend-reject'),
    path('friends/<int:pk>/cancel/', CancelFriendRequestView.as_view(), name='friend-cancel'),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/read-all/', NotificationReadAllView.as_view(), name='notification-read-all'),
    path('notifications/<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
    path('worlds/<int:world_id>/participants/search/', ParticipantSearchView.as_view(), name='participant-search'),
] + router.urls