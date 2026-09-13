from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Count, Min, Prefetch, Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from .models import (
    Bookmark,
    Epoch,
    Friendship,
    HistoryEvent,
    Idea,
    IdeaVote,
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
    WorldAccessRequest,
)
from .permissions import IsOwnerOrMember, IsWorldOwner, IsWorldEditorOrAbove, get_user_role
from .serializers import (
    BookmarkSerializer,
    EpochSerializer,
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
    RELATION_MODEL_MAP,
    RelationshipSerializer,
    TodoItemSerializer,
    UserPublicSerializer,
    UserSerializer,
    UserUpdateSerializer,
    WikiPageSerializer,
    WorldAccessRequestSerializer,
    WorldSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'


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
            import logging

            logging.getLogger(__name__).exception('Logout blacklist failed')
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


def world_list_queryset(user):
    """Світи з лічильниками одним запитом: annotate замість N+1,
    select_related для власника, prefetch лише своїх memberships
    (для current_user_role без додаткових запитів)."""
    return (
        World.objects.select_related('owner', 'owner__profile')
        .prefetch_related(
            Prefetch(
                'memberships',
                queryset=Membership.objects.filter(user=user),
                to_attr='my_membership',
            )
        )
        .annotate(
            players_count=Count('players', distinct=True),
            locations_count=Count('locations', distinct=True),
            todos_count=Count('todos', distinct=True),
            todos_done=Count('todos', filter=Q(todos__is_done=True), distinct=True),
            history_count=Count('history', distinct=True),
            epochs_count=Count('epochs', distinct=True),
            notes_count=Count('notes', distinct=True),
            projects_count=Count('projects', distinct=True),
            bookmarks_count=Count('bookmarks', distinct=True),
            ideas_count=Count('ideas', distinct=True),
            wiki_count=Count('wiki_pages', distinct=True),
        )
    )


class WorldViewSet(viewsets.ModelViewSet):
    serializer_class = WorldSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        # Змінювати/видаляти світ може лише власник; читати — будь-який учасник
        if self.action in ('update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsWorldOwner()]
        return [permissions.IsAuthenticated(), IsOwnerOrMember()]

    def get_queryset(self):
        return world_list_queryset(self.request.user).filter(
            Q(owner=self.request.user)
            | Q(memberships__user=self.request.user,
                memberships__status=Membership.Status.ACTIVE)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class RelatedViewSetMixin:
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated(), IsOwnerOrMember()]
        return [permissions.IsAuthenticated(), IsWorldEditorOrAbove()]

    def get_queryset(self):
        queryset = super().get_queryset()
        world_id = self.kwargs.get('world_id')
        if world_id:
            queryset = queryset.filter(world_id=world_id)
        return queryset

    def perform_create(self, serializer):
        world_id = self.kwargs['world_id']
        if not World.objects.filter(pk=world_id).exists():
            raise NotFound('World not found.')
        serializer.save(world_id=world_id)


class PlayerViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]


class LocationViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Location.objects.prefetch_related('screenshots').all()
    serializer_class = LocationSerializer


class LocationScreenshotViewSet(viewsets.ModelViewSet):
    queryset = LocationScreenshot.objects.all()
    serializer_class = LocationScreenshotSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated(), IsOwnerOrMember()]
        return [permissions.IsAuthenticated(), IsWorldEditorOrAbove()]

    def get_queryset(self):
        return LocationScreenshot.objects.filter(
            location_id=self.kwargs.get('location_id'),
            location__world_id=self.kwargs.get('world_id'),
        )

    def perform_create(self, serializer):
        # Дозволяємо галерею: кожне завантаження додає фото, не видаляючи старі.
        # Ліміт 8 фото на локацію, щоб не роздувати сховище.
        location_id = self.kwargs['location_id']
        with transaction.atomic():
            # Блокуємо рядки локації, щоб race двох паралельних аплоадів не дав 9+.
            Location.objects.select_for_update().filter(pk=location_id).first()
            if LocationScreenshot.objects.filter(location_id=location_id).count() >= 8:
                from rest_framework.exceptions import ValidationError
                raise ValidationError('Максимум 8 фото на локацію.')
            serializer.save(location_id=location_id)

    def perform_destroy(self, instance):
        if instance.image:
            instance.image.delete(save=False)
        instance.delete()


class TodoViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = TodoItem.objects.all()
    serializer_class = TodoItemSerializer

    def perform_create(self, serializer):
        world_id = self.kwargs['world_id']
        if not World.objects.filter(pk=world_id).exists():
            raise NotFound('World not found.')
        project = serializer.validated_data.get('project')
        if not serializer.validated_data.get('order'):
            # Нові завдання стають нагору своєї групи
            # (проєкт або неприв'язані): менший order — вище.
            min_order = (
                TodoItem.objects.filter(world_id=world_id, project=project)
                .aggregate(m=Min('order'))['m']
            )
            serializer.save(
                world_id=world_id,
                order=(min_order - 1) if min_order is not None else 0,
            )
        else:
            serializer.save(world_id=world_id)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request, world_id=None):
        """Переставити завдання: {project: id|null, ids: [...] зверху вниз}."""
        ids = request.data.get('ids')
        project_id = request.data.get('project')
        if not isinstance(ids, list) or not ids:
            raise ValidationError('Поле ids має бути непорожнім списком.')
        with transaction.atomic():
            todos = list(
                TodoItem.objects.select_for_update().filter(world_id=world_id, id__in=ids)
            )
            if len(todos) != len(set(ids)):
                raise ValidationError('Знайдено не всі завдання в цьому світі.')
        if project_id is None:
            if any(t.project_id is not None for t in todos):
                raise ValidationError('Усі завдання мають бути неприв\'язаними.')
        elif any(t.project_id != project_id for t in todos):
            raise ValidationError('Усі завдання мають належати одному проєкту.')
        with transaction.atomic():
            for index, todo_id in enumerate(ids):
                TodoItem.objects.filter(pk=todo_id).update(order=index)
        return Response({'ok': True, 'ids': ids})


class HistoryEventViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = HistoryEvent.objects.select_related('epoch').all()
    serializer_class = HistoryEventSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def perform_create(self, serializer):
        world_id = self.kwargs['world_id']
        data = serializer.validated_data
        epoch = (data.get('epoch')
                 or Epoch.objects.filter(world_id=world_id, end_date__isnull=True).first()
                 or Epoch.objects.filter(world_id=world_id).order_by('-created_at').first())
        # Епоха завжди в межах світу з URL — ігноруємо чужу з body.
        if epoch is not None and str(epoch.world_id) != str(world_id):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'epoch': 'Розділ належить іншому світу.'})
        data['world_id'] = world_id
        if epoch:
            data['epoch'] = epoch
        serializer.save(**data)

    def perform_update(self, serializer):
        world_id = self.kwargs.get('world_id')
        epoch = serializer.validated_data.get('epoch')
        if epoch is not None and world_id is not None and str(epoch.world_id) != str(world_id):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'epoch': 'Розділ належить іншому світу.'})
        serializer.save()


class EpochViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Epoch.objects.annotate(events_count=Count('events')).all()
    serializer_class = EpochSerializer

    @action(detail=True, methods=['post'])
    def close(self, request, world_id=None, pk=None):
        """Завершити розділ й почати новий"""
        from django.utils import timezone
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError

        epoch = self.get_object()
        if epoch.end_date is not None:
            raise ValidationError('Розділ вже завершено.')
        new_name = (request.data.get('name') or '').strip()
        if not new_name:
            raise ValidationError({'name': 'Вкажіть назву нового розділу.'})
        if Epoch.objects.filter(world_id=epoch.world_id, name=new_name).exists():
            raise ValidationError({'name': 'Розділ з такою назвою вже існує.'})

        epoch.end_date = timezone.localdate()
        epoch.save(update_fields=['end_date'])

        new_epoch = Epoch.objects.create(world_id=epoch.world_id, name=new_name)
        serializer = EpochSerializer(new_epoch, context={'request': request})
        return Response(
            {'closed': EpochSerializer(epoch, context={'request': request}).data,
             'new': serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError
        epoch = self.get_object()
        if epoch.events.exists():
            raise ValidationError('Не можна видалити розділ, що містить події.')
        return super().destroy(request, *args, **kwargs)


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
            # Видаляти може власник (будь-кого) або сам учасник (покинути світ)
            return [permissions.IsAuthenticated(), IsOwnerOrMember()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        world_id = self.kwargs['world_id']
        world = World.objects.filter(pk=world_id).first()
        if world is None:
            raise NotFound('World not found.')
        # user передається як FK id; серіалайзер тримає його в validated_data,
        # бо поле writable через PrimaryKeyRelatedField за замовчуванням.
        # Дістаємо юзера надійно (підтримка і об'єкта, і id).
        user_value = serializer.validated_data.get('user')
        from django.contrib.auth.models import User as AuthUser
        user = user_value if hasattr(user_value, 'id') else AuthUser.objects.filter(pk=user_value).first()
        if user is None:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'user': 'Користувача не знайдено.'})
        if world.owner_id == user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Власник вже є учасником світу.')
        role = serializer.validated_data.get('role', Membership.Role.VIEWER)
        if role == Membership.Role.OWNER:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'role': 'Неможливо призначити роль owner.'})
        # Редактор може запрошувати лише viewer/editor (owner перевіряється пермішеном update).
        if world.owner_id != self.request.user.id and role not in (
            Membership.Role.VIEWER, Membership.Role.EDITOR,
        ):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'role': 'Недопустима роль.'})
        membership, created = Membership.objects.get_or_create(
            world_id=world_id, user=user,
            defaults={'role': role, 'status': Membership.Status.ACTIVE},
        )
        if not created:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Цей користувач вже є учасником цього світу.')
        # Якщо get_or_create знайшов PENDING-запрошення — активуємо його.
        if membership.status != Membership.Status.ACTIVE:
            membership.status = Membership.Status.ACTIVE
            membership.role = role
            membership.save(update_fields=['status', 'role'])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        world = instance.world
        if instance.user_id == world.owner_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Неможливо видалити власника світу.')
        is_owner = world.owner_id == request.user.id
        is_self = instance.user_id == request.user.id
        if not (is_owner or is_self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Тільки власник або сам учасник може видалити доступ.')
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        # Забороняємо зміну user/world через update; роль owner — заборонена.
        if 'user' in serializer.validated_data and serializer.validated_data['user'] != serializer.instance.user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'user': 'Неможливо змінити користувача членства.'})
        if serializer.validated_data.get('role') == Membership.Role.OWNER:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'role': 'Неможливо призначити роль owner.'})
        serializer.save()


class NoteViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer


class ProjectViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.annotate(
            todos_count=Count('todos', distinct=True),
            todos_done=Count('todos', filter=Q(todos__is_done=True), distinct=True),
        )


class BookmarkViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Bookmark.objects.all()
    serializer_class = BookmarkSerializer

    def get_permissions(self):
        # Перевірка посилань — операція читання, доступна всім учасникам
        if self.action == 'check':
            return [permissions.IsAuthenticated(), IsOwnerOrMember()]
        return super().get_permissions()

    def get_throttles(self):
        if self.action == 'check':
            from rest_framework.throttling import ScopedRateThrottle

            self.throttle_scope = 'linkcheck'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=['post'], url_path='check')
    def check(self, request, world_id=None):
        """Перевірити доступність посилань: HEAD (з fallback на GET), таймаут 5с.

        Body: {"ids": [...]} — без ids перевіряє всі. Ліміт 20 за раз.
        Повертає {id: {"ok": bool, "status": int}}.
        Тільки http/https, приватні IP та metadata-ендпоінти заблоковані.
        """
        ids = request.data.get('ids') or []
        qs = self.get_queryset()
        if ids:
            try:
                ids = [int(i) for i in ids]
            except (TypeError, ValueError):
                ids = []
            qs = qs.filter(pk__in=ids)
        targets = list(qs[:20])
        # Мережеві запити — паралельно, інакше пачка битих посилань
        # з таймаутами клала б запит на хвилини
        with ThreadPoolExecutor(max_workers=4) as pool:
            checked = list(pool.map(self._check_url, [b.url for b in targets]))
        return Response({b.pk: res for b, res in zip(targets, checked)})

    @staticmethod
    def _is_url_allowed(url):
        import ipaddress
        import socket
        from urllib.parse import urlparse

        try:
            parsed = urlparse(url)
        except ValueError:
            return False
        if parsed.scheme not in ('http', 'https'):
            return False
        if not parsed.hostname:
            return False
        # Блокуємо credentials в URL та нестандартні порти metadata.
        if parsed.username or parsed.password:
            return False
        try:
            infos = socket.getaddrinfo(parsed.hostname, None, type=socket.SOCK_STREAM)
        except (socket.gaierror, UnicodeError):
            return False
        for info in infos:
            ip_str = info[4][0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_reserved
                or ip.is_unspecified
            ):
                return False
        return True

    @staticmethod
    def _check_url(url):
        from urllib.parse import urlparse

        # Базова валідація схеми до резолву (SSRF-захист).
        try:
            if urlparse(url).scheme not in ('http', 'https'):
                return {'ok': False, 'status': 0}
        except ValueError:
            return {'ok': False, 'status': 0}
        if not BookmarkViewSet._is_url_allowed(url):
            return {'ok': False, 'status': 0}
        headers = {'User-Agent': 'WorldLog/1.0 link-check', 'Range': 'bytes=0-0'}
        for method in ('HEAD', 'GET'):
            try:
                req = urllib.request.Request(url, method=method, headers=headers)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    code = resp.getcode()
                    if 200 <= code < 400:
                        return {'ok': True, 'status': code}
                    if method == 'HEAD':
                        continue
                    return {'ok': False, 'status': code}
            except Exception:
                if method == 'HEAD':
                    continue
                return {'ok': False, 'status': 0}
        return {'ok': False, 'status': 0}


class IdeaViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = Idea.objects.all()
    serializer_class = IdeaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated:
            return qs.prefetch_related(
                Prefetch('idea_votes', queryset=IdeaVote.objects.filter(user=user), to_attr='my_votes')
            )
        return qs

    @action(detail=True, methods=['post'])
    def vote(self, request, world_id=None, pk=None):
        """Голосування за ідею — один голос одного юзера (захист від накрутки)."""
        idea = self.get_object()
        _, created = IdeaVote.objects.get_or_create(idea=idea, user=request.user)
        if not created:
            return Response(
                {'detail': 'Ви вже голосували за цю ідею.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        idea.votes = IdeaVote.objects.filter(idea=idea).count()
        idea.save(update_fields=['votes'])
        return Response(IdeaSerializer(idea, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def unvote(self, request, world_id=None, pk=None):
        idea = self.get_object()
        deleted, _ = IdeaVote.objects.filter(idea=idea, user=request.user).delete()
        if not deleted:
            return Response(
                {'detail': 'Ви не голосували за цю ідею.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        idea.votes = IdeaVote.objects.filter(idea=idea).count()
        idea.save(update_fields=['votes'])
        return Response(IdeaSerializer(idea, context={'request': request}).data)

    def get_permissions(self):
        # Голосувати можуть всі учасники, змінювати — редактори+
        if self.action in ('vote', 'unvote'):
            return [permissions.IsAuthenticated(), IsOwnerOrMember()]
        return super().get_permissions()


class WikiPageViewSet(RelatedViewSetMixin, viewsets.ModelViewSet):
    queryset = WikiPage.objects.all()
    serializer_class = WikiPageSerializer

    @action(detail=False, methods=['get'], url_path='graph')
    def graph(self, request, world_id=None):
        """Граф зв'язків вікі: вузли — сторінки й повʼязані елементи світу,
        ребра — [[згадки]] та Relationship (у т.ч. встановлені поза wiki)."""
        world_id = self.kwargs.get('world_id')
        pages = list(WikiPage.objects.filter(world_id=world_id))
        page_ids = {p.id for p in pages}
        title_to_id = {p.title.strip().lower(): p.id for p in pages}

        nodes = [
            {'id': p.id, 'type': p.page_type, 'title': p.title, 'emoji': p.emoji or ''}
            for p in pages
        ]
        node_ids = {p.id for p in pages}  # числові id вікі-сторінок
        # id зовнішніх вузлів — "тип:id", щоб не конфліктувати з id сторінок
        external_ids = set()

        def add_external(etype, entity_id):
            key = f'{etype}:{entity_id}'
            if key not in external_ids and key not in node_ids:
                external_ids.add(key)
                model = RELATION_MODEL_MAP.get(etype)
                title = ''
                if model is not None:
                    title = str(
                        model.objects.filter(world_id=world_id, pk=entity_id).first() or ''
                    )
                nodes.append(
                    {
                        'id': key,
                        'type': etype,
                        'title': title,
                        'emoji': EXTERNAL_EMOJI.get(etype, '📄'),
                    }
                )

        # Повертає ключ вузла для сутності, за потреби додаючи його в граф.
        # Вікі-сторінки — числові id (вузол вже існує), решта — "тип:id".
        def node_ref(etype, entity_id):
            if etype == 'wiki_page':
                return entity_id
            add_external(etype, entity_id)
            return f'{etype}:{entity_id}'

        def add_edge(source, target, kind, label=''):
            key = (source, target)
            if key in seen:
                existing_label = edge_labels.get(key)
                if label and not existing_label:
                    edge_labels[key] = label
                    existing = next(
                        (e for e in edges if e['source'] == key[0] and e['target'] == key[1]),
                        None,
                    )
                    if existing is not None:
                        existing['label'] = label
                return
            seen.add(key)
            edge_labels[key] = label
            edges.append({'source': source, 'target': target, 'kind': kind, 'label': label})

        edges = []
        seen = set()
        edge_labels = {}

        for p in pages:
            for raw in re.findall(r'\[\[(?:wiki:)?([^\]|]+)\]\]', p.content):
                target_id = title_to_id.get(raw.strip().lower())
                if target_id is None or target_id == p.id:
                    continue
                add_edge(p.id, target_id, 'link')

        for rel in Relationship.objects.filter(world_id=world_id):
            src = node_ref(rel.source_type, rel.source_id)
            tgt = node_ref(rel.target_type, rel.target_id)
            if src == tgt:
                continue
            add_edge(src, tgt, 'rel', rel.label)

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


class FriendshipViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        friendships = Friendship.objects.filter(
            Q(user_a=user) | Q(user_b=user)
        ).select_related('user_a', 'user_b', 'user_a__profile', 'user_b__profile', 'sender')

        status_filter = request.query_params.get('status')
        if status_filter:
            friendships = friendships.filter(status=status_filter)

        serializer = FriendshipSerializer(
            friendships, many=True, context={'request': request.user, 'request_obj': request}
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
    throttle_scope = 'friend'

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
                sender_id = existing.sender_id or existing.user_a_id
                if sender_id == user.id:
                    return Response(
                        {'detail': 'Friend request already sent.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Зустрічна заявка — приймаємо одразу + нотифікація автору першої.
                existing.status = Friendship.Status.ACCEPTED
                existing.save()
                Notification.objects.create(
                    user_id=sender_id,
                    notification_type=Notification.Type.FRIEND_ACCEPTED,
                    from_user=user,
                    message=f'{user.username} прийняв ваш запит у друзі',
                )
                serializer = FriendshipSerializer(existing, context={'request': user, 'request_obj': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

        try:
            friendship = Friendship.objects.create(
                user_a_id=user_a_id,
                user_b_id=user_b_id,
                sender=user,
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

        serializer = FriendshipSerializer(friendship, context={'request': user, 'request_obj': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcceptFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'friend'

    def post(self, request, pk):
        user = request.user
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {'detail': 'Friend request not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.id not in (friendship.user_a_id, friendship.user_b_id):
            return Response(
                {'detail': 'Not your friendship.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        sender_id = friendship.sender_id or friendship.user_a_id
        if sender_id == user.id:
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
            user_id=(friendship.sender_id or friendship.user_a_id),
            notification_type=Notification.Type.FRIEND_ACCEPTED,
            from_user=user,
            message=f'{user.username} прийняв ваш запит у друзі',
        )

        serializer = FriendshipSerializer(friendship, context={'request': user, 'request_obj': request})
        return Response(serializer.data)


class RejectFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'friend'

    def post(self, request, pk):
        user = request.user
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {'detail': 'Friend request not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.id not in (friendship.user_a_id, friendship.user_b_id):
            return Response(
                {'detail': 'Not your friendship.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        sender_id = friendship.sender_id or friendship.user_a_id
        if sender_id == user.id:
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
    throttle_scope = 'friend'

    def post(self, request, pk):
        user = request.user
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {'detail': 'Friend request not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.id not in (friendship.user_a_id, friendship.user_b_id):
            return Response(
                {'detail': 'Not your friendship.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        sender_id = friendship.sender_id or friendship.user_a_id
        if sender_id != user.id:
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
    throttle_scope = 'friend'

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
                data['friendship'] = FriendshipSerializer(f, context={'request': request.user, 'request_obj': request}).data
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
        notifications = (
            Notification.objects.filter(user=request.user)
            .select_related('from_user', 'from_user__profile', 'access_request', 'access_request__world')
            .order_by('-created_at')[:50]
        )
        serializer = NotificationSerializer(notifications, many=True, context={'request': request})
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
    throttle_scope = 'friend'

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

        # Тільки учасники світу можуть шукати кандидатів в цей світ.
        if world.owner_id != request.user.id and not world.memberships.filter(
            user=request.user, status=Membership.Status.ACTIVE
        ).exists():
            return Response(
                {'detail': 'Доступ заборонено.'},
                status=status.HTTP_403_FORBIDDEN,
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


class WorldSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()

        base = world_list_queryset(request.user).filter(
            is_public=True,
        ).exclude(
            owner=request.user
        ).exclude(
            memberships__user=request.user,
            memberships__status=Membership.Status.ACTIVE,
        )
        if len(query) < 2:
            # Без запиту — стрічка останніх публічних світів для хаба пошуку
            worlds = base.order_by('-created_at')[:20]
        else:
            worlds = base.filter(
                Q(name__icontains=query) | Q(description__icontains=query)
            )[:20]

        serializer = WorldSerializer(worlds, many=True, context={'request': request})
        return Response(serializer.data)


class WorldAccessRequestViewSet(viewsets.ModelViewSet):
    serializer_class = WorldAccessRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        world_id = self.kwargs.get('world_id')
        if not world_id:
            return WorldAccessRequest.objects.none()
        world = World.objects.filter(pk=world_id).first()
        # Чергу вхідних бачить лише власник світу
        if world is None or world.owner_id != self.request.user.id:
            return WorldAccessRequest.objects.none()
        return WorldAccessRequest.objects.filter(world_id=world_id).select_related('requester', 'requester__profile', 'world')

    def perform_create(self, serializer):
        world_id = self.kwargs['world_id']
        world = World.objects.filter(pk=world_id).first()
        if world is None:
            raise NotFound('World not found.')
        user = self.request.user
        if world.owner_id == user.id:
            raise ValidationError('You already own this world.')
        if Membership.objects.filter(
            world=world, user=user, status=Membership.Status.ACTIVE
        ).exists():
            raise ValidationError('You already have access to this world.')
        if WorldAccessRequest.objects.filter(
            world=world, requester=user, status=WorldAccessRequest.Status.PENDING
        ).exists():
            raise ValidationError('Access request already pending.')
        # Повторний запит після відхилення: старий термінальний видаляємо.
        WorldAccessRequest.objects.filter(
            world=world, requester=user, status=WorldAccessRequest.Status.REJECTED
        ).delete()
        # Якщо лишився ACCEPTED, але membership зник (юзер вийшов) —
        # видаляємо старий термінальний, щоб дозволити новий запит.
        stale = WorldAccessRequest.objects.filter(
            world=world, requester=user, status=WorldAccessRequest.Status.ACCEPTED
        ).first()
        if stale is not None:
            if not Membership.objects.filter(
                world=world, user=user, status=Membership.Status.ACTIVE
            ).exists():
                stale.delete()
            else:
                raise ValidationError('Access request already exists.')
        try:
            instance = serializer.save(requester=user, world=world)
        except IntegrityError:
            raise ValidationError('Access request already exists.')
        Notification.objects.create(
            user=world.owner,
            notification_type=Notification.Type.WORLD_ACCESS_REQUEST,
            from_user=user,
            message=f'«{user.username}» просить доступ до світу «{world.name}»',
            access_request=instance,
        )


class AcceptWorldAccessRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            access_request = WorldAccessRequest.objects.get(pk=pk)
        except WorldAccessRequest.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        world = access_request.world
        if world.owner_id != request.user.id:
            return Response({'detail': 'Only the world owner can accept requests.'}, status=status.HTTP_403_FORBIDDEN)

        if access_request.status != WorldAccessRequest.Status.PENDING:
            return Response({'detail': 'This request is no longer pending.'}, status=status.HTTP_400_BAD_REQUEST)

        access_request.status = WorldAccessRequest.Status.ACCEPTED
        access_request.save()

        membership, _ = Membership.objects.get_or_create(
            world=world,
            user=access_request.requester,
            defaults={'role': Membership.Role.VIEWER, 'status': Membership.Status.ACTIVE},
        )
        # Якщо інвайт створив PENDING-membership — активуємо його при accept.
        if membership.status != Membership.Status.ACTIVE:
            membership.status = Membership.Status.ACTIVE
            membership.save(update_fields=['status'])

        Notification.objects.create(
            user=access_request.requester,
            notification_type=Notification.Type.WORLD_ACCESS_ACCEPTED,
            from_user=request.user,
            message=f'Ваш запит на доступ до світу "{world.name}" прийнято',
            access_request=access_request,
        )

        return Response(WorldAccessRequestSerializer(access_request, context={'request': request}).data)


class RejectWorldAccessRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            access_request = WorldAccessRequest.objects.get(pk=pk)
        except WorldAccessRequest.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        world = access_request.world
        if world.owner_id != request.user.id:
            return Response({'detail': 'Only the world owner can reject requests.'}, status=status.HTTP_403_FORBIDDEN)

        if access_request.status != WorldAccessRequest.Status.PENDING:
            return Response({'detail': 'This request is no longer pending.'}, status=status.HTTP_400_BAD_REQUEST)

        access_request.status = WorldAccessRequest.Status.REJECTED
        access_request.save()

        Notification.objects.create(
            user=access_request.requester,
            notification_type=Notification.Type.WORLD_ACCESS_REJECTED,
            from_user=request.user,
            message=f'Ваш запит на доступ до світу "{world.name}" відхилено',
            access_request=access_request,
        )

        return Response(WorldAccessRequestSerializer(access_request, context={'request': request}).data)


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

# Емодзі-заповнювачі для вузлів графа, коли у зовнішніх елементів немає власного.
EXTERNAL_EMOJI = {
    'player': '🧑',
    'location': '📍',
    'project': '🏗️',
    'todo': '✅',
    'event': '📅',
    'note': '📝',
    'bookmark': '🔖',
    'idea': '💡',
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
