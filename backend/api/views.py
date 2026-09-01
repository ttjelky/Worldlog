from django.contrib.auth.models import User
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

import re

from .models import (
    Bookmark,
    HistoryEvent,
    Idea,
    Location,
    LocationScreenshot,
    Membership,
    Note,
    Player,
    Project,
    Relationship,
    TodoItem,
    WikiPage,
    World,
)
from .permissions import IsOwnerOrMember
from .serializers import (
    BookmarkSerializer,
    HistoryEventSerializer,
    IdeaSerializer,
    LocationScreenshotSerializer,
    LocationSerializer,
    MembershipSerializer,
    NoteSerializer,
    PlayerSerializer,
    ProjectSerializer,
    RELATION_MODEL_MAP,
    RelationshipSerializer,
    TodoItemSerializer,
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
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

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
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer


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

    @action(detail=False, methods=['get'], url_path='graph')
    def graph(self, request, world_id=None):
        """Граф зв'язків вікі: вузли — сторінки, ребра — [[згадки]] і Relationship."""
        world_id = self.kwargs.get('world_id')
        pages = list(WikiPage.objects.filter(world_id=world_id))
        node_ids = {p.id for p in pages}
        title_to_id = {p.title.strip().lower(): p.id for p in pages}

        nodes = [
            {'id': p.id, 'type': p.page_type, 'title': p.title, 'emoji': p.emoji or ''}
            for p in pages
        ]

        edges = []
        seen = set()

        for p in pages:
            for raw in re.findall(r'\[\[(?:wiki:)?([^\]|]+)\]\]', p.content):
                target_id = title_to_id.get(raw.strip().lower())
                if target_id is None or target_id == p.id:
                    continue
                key = (p.id, target_id)
                if key not in seen:
                    seen.add(key)
                    edges.append(
                        {'source': p.id, 'target': target_id, 'kind': 'link', 'label': ''}
                    )

        for rel in Relationship.objects.filter(
            world_id=world_id, source_type='wiki_page', target_type='wiki_page'
        ):
            if rel.source_id == rel.target_id:
                continue
            if rel.source_id not in node_ids or rel.target_id not in node_ids:
                continue
            key = (rel.source_id, rel.target_id)
            existing = next(
                (e for e in edges if e['source'] == key[0] and e['target'] == key[1]),
                None,
            )
            if existing is None:
                edges.append(
                    {
                        'source': rel.source_id,
                        'target': rel.target_id,
                        'kind': 'rel',
                        'label': rel.label,
                    }
                )
            elif rel.label and not existing['label']:
                existing['label'] = rel.label

        return Response({'nodes': nodes, 'edges': edges})


class RelationshipViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Relationship.objects.all()
    serializer_class = RelationshipSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get('source_type') and params.get('source_id'):
            queryset = queryset.filter(
                source_type=params['source_type'], source_id=params['source_id']
            )
        if params.get('target_type') and params.get('target_id'):
            queryset = queryset.filter(
                target_type=params['target_type'], target_id=params['target_id']
            )
        return queryset


ENTITY_NAME_FIELDS = {
    'player': 'nickname',
    'location': 'name',
    'wiki_page': 'title',
    'project': 'title',
    'todo': 'title',
    'event': 'title',
    'note': 'title',
    'bookmark': 'title',
    'idea': 'title',
}


class WorldEntitiesView(APIView):
    """Список сутностей світу для пікера зв'язків у картках.

    Повертає плоский список [{id, type, name}]. Пошук через ?q=,
    фільтр за типом через ?type=, виключення самого елемента через
    ?exclude_type= + ?exclude_id=.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]

    def get(self, request, world_id):
        world = World.objects.filter(pk=world_id).first()
        if world is None:
            return Response(
                {'detail': 'Світ не знайдено'}, status=status.HTTP_404_NOT_FOUND
            )
        if world.owner_id != request.user.id and not world.memberships.filter(
            user=request.user, status='active'
        ).exists():
            return Response(
                {'detail': 'Доступ заборонено'}, status=status.HTTP_403_FORBIDDEN
            )

        q = request.query_params.get('q', '').strip()
        entity_type = request.query_params.get('type')
        exclude_type = request.query_params.get('exclude_type')
        exclude_id = request.query_params.get('exclude_id')
        try:
            limit = min(int(request.query_params.get('limit', 200)), 500)
        except (TypeError, ValueError):
            limit = 200

        results = []
        for etype, model in RELATION_MODEL_MAP.items():
            if entity_type and etype != entity_type:
                continue
            name_field = ENTITY_NAME_FIELDS[etype]
            qs = model.objects.filter(world_id=world_id)
            if q:
                qs = qs.filter(**{f'{name_field}__icontains': q})
            if exclude_type == etype and exclude_id:
                qs = qs.exclude(pk=exclude_id)
            for obj in qs.order_by(name_field)[:limit]:
                results.append(
                    {'id': obj.pk, 'type': etype, 'name': getattr(obj, name_field)}
                )
        return Response(results)
