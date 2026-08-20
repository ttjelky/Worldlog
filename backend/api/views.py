from django.contrib.auth.models import User
from rest_framework import generics, permissions, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import (
    HistoryEvent,
    Location,
    LocationScreenshot,
    Membership,
    Player,
    TodoItem,
    World,
)
from .permissions import IsOwnerOrMember
from .serializers import (
    HistoryEventSerializer,
    LocationScreenshotSerializer,
    LocationSerializer,
    MembershipSerializer,
    PlayerSerializer,
    TodoItemSerializer,
    UserSerializer,
    WorldSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class WorldViewSet(viewsets.ModelViewSet):
    serializer_class = WorldSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return World.objects.filter(
            owner=self.request.user
        ) | World.objects.filter(memberships__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


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
        serializer.save(location_id=self.kwargs['location_id'])


class TodoViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = TodoItem.objects.all()
    serializer_class = TodoItemSerializer


class HistoryEventViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = HistoryEvent.objects.all()
    serializer_class = HistoryEventSerializer


class MembershipViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
