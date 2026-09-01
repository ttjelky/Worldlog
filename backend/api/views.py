from django.contrib.auth.models import User
from django.db import IntegrityError
from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Bookmark,
    Friendship,
    HistoryEvent,
    Idea,
    Location,
    LocationScreenshot,
    Membership,
    Note,
    Notification,
    Player,
    Project,
    Relationship,
    TodoItem,
    UserProfile,
    WikiPage,
    World,
)
from .permissions import IsOwnerOrMember, IsWorldOwner, IsWorldEditorOrAbove, get_user_role
from .serializers import (
    BookmarkSerializer,
    FriendshipSerializer,
    HistoryEventSerializer,
    IdeaSerializer,
    LocationScreenshotSerializer,
    LocationSerializer,
    MembershipSerializer,
    NoteSerializer,
    NotificationSerializer,
    PlayerSerializer,
    ProfileUpdateSerializer,
    ProjectSerializer,
    RelationshipSerializer,
    TodoItemSerializer,
    UserPublicSerializer,
    UserSerializer,
    UserUpdateSerializer,
    WikiPageSerializer,
    WorldSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                from rest_framework_simplejwt.tokens import RefreshToken

                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class UserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        user = request.user
        data = UserPublicSerializer(user, context={'request': request}).data
        data['email'] = user.email
        return Response(data)


class ProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)

        user = request.user
        data = UserPublicSerializer(user, context={'request': request}).data
        data['email'] = user.email
        return Response(data)


class WorldViewSet(viewsets.ModelViewSet):
    serializer_class = WorldSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return World.objects.filter(
            owner=self.request.user
        ) | World.objects.filter(memberships__user=self.request.user)

    def perform_create(self, serializer):
        world = serializer.save(owner=self.request.user)
        Membership.objects.get_or_create(
            world=world, user=self.request.user,
            defaults={'role': Membership.Role.OWNER, 'status': Membership.Status.ACTIVE},
        )


class RelatedViewSetMixin:
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]

    def get_queryset(self):
        queryset = super().get_queryset()
        world_id = self.kwargs.get('world_id')
        if world_id:
            queryset = queryset.filter(world_id=world_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(world_id=self.kwargs['world_id'])


class PlayerViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]


class LocationViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


class LocationScreenshotViewSet(viewsets.ModelViewSet):
    queryset = LocationScreenshot.objects.all()
    serializer_class = LocationScreenshotSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return LocationScreenshot.objects.filter(
            location_id=self.kwargs.get('location_id'),
            location__world_id=self.kwargs.get('world_id'),
        )

    def perform_create(self, serializer):
        # У локації може бути лише одне фото — нове завантаження
        # замінює попереднє
        location_id = self.kwargs['location_id']
        LocationScreenshot.objects.filter(location_id=location_id).delete()
        serializer.save(location_id=location_id)


class TodoViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = TodoItem.objects.all()
    serializer_class = TodoItemSerializer


class HistoryEventViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = HistoryEvent.objects.all()
    serializer_class = HistoryEventSerializer


class MembershipViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Membership.objects.select_related('user', 'user__profile').all()
    serializer_class = MembershipSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated(), IsOwnerOrMember()]
        if self.action in ('update', 'partial_update'):
            return [permissions.IsAuthenticated(), IsWorldOwner()]
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsWorldEditorOrAbove()]
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsWorldOwner()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        world_id = self.kwargs['world_id']
        world = World.objects.get(pk=world_id)
        user = serializer.validated_data['user']
        if world.owner_id == user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Власник вже є учасником світу.')
        membership, created = Membership.objects.get_or_create(
            world_id=world_id, user=user,
            defaults={'role': serializer.validated_data.get('role', Membership.Role.VIEWER)},
        )
        if not created:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Цей користувач вже є учасником цього світу.')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        world = instance.world
        if instance.user_id == world.owner_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Неможливо видалити власника світу.')
        return super().destroy(request, *args, **kwargs)


class NoteViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer


class ProjectViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


class BookmarkViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Bookmark.objects.all()
    serializer_class = BookmarkSerializer


class IdeaViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Idea.objects.all()
    serializer_class = IdeaSerializer


class WikiPageViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = WikiPage.objects.all()
    serializer_class = WikiPageSerializer


class RelationshipViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Relationship.objects.all()
    serializer_class = RelationshipSerializer


class FriendshipViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        friendships = Friendship.objects.filter(
            Q(user_a=user) | Q(user_b=user)
        ).select_related('user_a', 'user_b')

        status_filter = request.query_params.get('status')
        if status_filter:
            friendships = friendships.filter(status=status_filter)

        serializer = FriendshipSerializer(
            friendships, many=True, context={'request': user}
        )
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        user = request.user
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {'detail': 'Friendship not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if friendship.status != Friendship.Status.ACCEPTED:
            return Response(
                {'detail': 'This is not an active friendship.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.id not in (friendship.user_a_id, friendship.user_b_id):
            return Response(
                {'detail': 'Not your friendship.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        friendship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SendFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        target_id = request.data.get('user_id')

        if not target_id:
            return Response(
                {'detail': 'user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target = User.objects.get(pk=target_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target.id == user.id:
            return Response(
                {'detail': 'Cannot send friend request to yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_a_id, user_b_id = sorted([user.id, target.id])

        existing = Friendship.objects.filter(
            user_a_id=user_a_id, user_b_id=user_b_id
        ).first()

        if existing:
            if existing.status == Friendship.Status.ACCEPTED:
                return Response(
                    {'detail': 'You are already friends.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if existing.status == Friendship.Status.BLOCKED:
                return Response(
                    {'detail': 'Unable to send friend request.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if existing.status == Friendship.Status.PENDING:
                if existing.user_a_id == user.id:
                    return Response(
                        {'detail': 'Friend request already sent.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                existing.status = Friendship.Status.ACCEPTED
                existing.save()
                serializer = FriendshipSerializer(existing, context={'request': user})
                return Response(serializer.data, status=status.HTTP_200_OK)

        try:
            friendship = Friendship.objects.create(
                user_a_id=user_a_id,
                user_b_id=user_b_id,
                status=Friendship.Status.PENDING,
            )
        except IntegrityError:
            return Response(
                {'detail': 'Friend request already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Notification.objects.create(
            user=target,
            notification_type=Notification.Type.FRIEND_REQUEST,
            from_user=user,
            message=f'{user.username} хоче додати вас у друзі',
        )

        serializer = FriendshipSerializer(friendship, context={'request': user})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcceptFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {'detail': 'Friend request not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if friendship.user_b_id != user.id:
            return Response(
                {'detail': 'You can only accept requests sent to you.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if friendship.status != Friendship.Status.PENDING:
            return Response(
                {'detail': 'This request is no longer pending.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        friendship.status = Friendship.Status.ACCEPTED
        friendship.save()

        Notification.objects.create(
            user=friendship.user_a,
            notification_type=Notification.Type.FRIEND_ACCEPTED,
            from_user=user,
            message=f'{user.username} прийняв ваш запит у друзі',
        )

        serializer = FriendshipSerializer(friendship, context={'request': user})
        return Response(serializer.data)


class RejectFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {'detail': 'Friend request not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if friendship.user_b_id != user.id:
            return Response(
                {'detail': 'You can only reject requests sent to you.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if friendship.status != Friendship.Status.PENDING:
            return Response(
                {'detail': 'This request is no longer pending.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        friendship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CancelFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {'detail': 'Friend request not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if friendship.user_a_id != user.id:
            return Response(
                {'detail': 'You can only cancel requests you sent.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if friendship.status != Friendship.Status.PENDING:
            return Response(
                {'detail': 'This request is no longer pending.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        friendship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])

        users = User.objects.filter(
            username__icontains=query
        ).exclude(id=request.user.id)[:20]

        user_ids = [u.id for u in users]
        friendships = Friendship.objects.filter(
            Q(user_a_id__in=user_ids, user_b=request.user) |
            Q(user_b_id__in=user_ids, user_a=request.user)
        )
        friendship_map = {}
        for f in friendships:
            other_id = f.user_b_id if f.user_a_id == request.user.id else f.user_a_id
            friendship_map[other_id] = f

        results = []
        for u in users:
            data = UserPublicSerializer(u, context={'request': request}).data
            f = friendship_map.get(u.id)
            if f:
                data['friendship'] = FriendshipSerializer(f, context={'request': request.user}).data
            else:
                data['friendship'] = None
            results.append(data)

        return Response(results)


class UserPublicProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = UserPublicSerializer(user, context={'request': request}).data

        if user.id != request.user.id:
            user_a_id, user_b_id = sorted([request.user.id, user.id])
            try:
                friendship = Friendship.objects.get(
                    user_a_id=user_a_id, user_b_id=user_b_id
                )
                data['friendship'] = FriendshipSerializer(
                    friendship, context={'request': request.user}
                ).data
            except Friendship.DoesNotExist:
                data['friendship'] = None
        else:
            data['friendship'] = None

        return Response(data)


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)[:50]
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        notification.is_read = True
        notification.save()
        return Response({'detail': 'Marked as read.'})


class NotificationReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All marked as read.'})


class ParticipantSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, world_id):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])

        try:
            world = World.objects.get(pk=world_id)
        except World.DoesNotExist:
            return Response(
                {'detail': 'World not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing_user_ids = set(
            world.memberships.values_list('user_id', flat=True)
        )
        existing_user_ids.add(world.owner_id)

        users = User.objects.filter(
            username__icontains=query
        ).exclude(id__in=existing_user_ids)[:20]

        user_ids = [u.id for u in users]
        friendships = Friendship.objects.filter(
            Q(user_a_id__in=user_ids, user_b=request.user) |
            Q(user_b_id__in=user_ids, user_a=request.user),
            status=Friendship.Status.ACCEPTED,
        )
        friend_ids = set()
        for f in friendships:
            friend_ids.add(f.user_b_id if f.user_a_id == request.user.id else f.user_a_id)

        results = []
        for u in users:
            data = UserPublicSerializer(u, context={'request': request}).data
            data['is_friend'] = u.id in friend_ids
            results.append(data)

        return Response(results)
