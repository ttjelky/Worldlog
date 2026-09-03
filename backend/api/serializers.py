import re

from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Bookmark,
    Epoch,
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
    WorldAccessRequest,
)

# Всі типи елементів світу, які можуть брати участь у зв'язках.
# Ключ — значення Relationship.SourceType, значення — (модель, назва поля імені).
RELATION_MODEL_MAP = {
    'player': Player,
    'location': Location,
    'wiki_page': WikiPage,
    'project': Project,
    'todo': TodoItem,
    'event': HistoryEvent,
    'note': Note,
    'bookmark': Bookmark,
    'idea': Idea,
}


class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ('email', 'password')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'username' in self.fields:
            del self.fields['username']

    def validate(self, attrs):
        email = attrs.pop('email', '').strip().lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise AuthenticationFailed(
                'Невірна електронна пошта або пароль'
            )
        attrs['username'] = user.username
        return super().validate(attrs)

USERNAME_RE = re.compile(r'^[\w.@+-]+$')


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {
            'email': {'required': True},
            'password': {'write_only': True},
        }

    def validate_username(self, value):
        value = value.strip().lower()
        if not USERNAME_RE.match(value):
            raise serializers.ValidationError(
                'Допустимі символи: букви, цифри, @ . + - _'
            )
        if len(value) < 3:
            raise serializers.ValidationError(
                'Мінімальна довжина — 3 символи'
            )
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                'Користувач з таким іменем вже існує'
            )
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if not value:
            raise serializers.ValidationError('Email є обов\'язковим')
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                'Користувач з таким email вже існує'
            )
        return value

    def validate_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if 'username' in attrs:
            attrs['username'] = attrs['username'].strip().lower()
        if 'email' in attrs:
            attrs['email'] = attrs['email'].strip().lower()
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'current_password', 'new_password')

    def validate_current_password(self, value):
        if not self.instance.check_password(value):
            raise serializers.ValidationError('Невірний поточний пароль')
        return value

    def validate_new_password(self, value):
        if value:
            try:
                password_validation.validate_password(value, self.instance)
            except DjangoValidationError as e:
                raise serializers.ValidationError(list(e.messages))
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError(
                'Користувач з таким email вже існує'
            )
        return value

    def validate_username(self, value):
        value = value.strip().lower()
        if not USERNAME_RE.match(value):
            raise serializers.ValidationError(
                'Допустимі символи: букви, цифри, @ . + - _'
            )
        if len(value) < 3:
            raise serializers.ValidationError(
                'Мінімальна довжина — 3 символи'
            )
        if User.objects.filter(username__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError(
                'Користувач з таким іменем вже існує'
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if 'username' in attrs:
            attrs['username'] = attrs['username'].strip().lower()
        if 'email' in attrs:
            attrs['email'] = attrs['email'].strip().lower()
        return attrs

    def update(self, instance, validated_data):
        validated_data.pop('current_password', None)
        new_password = validated_data.pop('new_password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if new_password:
            instance.set_password(new_password)
        instance.save()
        return instance


class AbsoluteURLImageField(serializers.ImageField):
    """Приймає файл при записі та повертає абсолютний URL при читанні."""

    def to_representation(self, value):
        if not value:
            return None
        try:
            url = value.url
        except (ValueError, OSError):
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url


class LocationScreenshotSerializer(serializers.ModelSerializer):
    image = AbsoluteURLImageField()

    class Meta:
        model = LocationScreenshot
        fields = ('id', 'image')


class LocationSerializer(serializers.ModelSerializer):
    screenshots = LocationScreenshotSerializer(many=True, read_only=True)

    class Meta:
        model = Location
        fields = (
            'id',
            'world',
            'name',
            'description',
            'x',
            'y',
            'z',
            'category',
            'screenshots',
        )
        read_only_fields = ('world',)


class PlayerSerializer(serializers.ModelSerializer):
    avatar = AbsoluteURLImageField(required=False, allow_null=True)

    class Meta:
        model = Player
        fields = ('id', 'world', 'nickname', 'role_note', 'avatar')
        read_only_fields = ('world',)


class TodoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoItem
        fields = (
            'id',
            'world',
            'project',
            'title',
            'description',
            'is_done',
            'priority',
            'due_date',
        )
        read_only_fields = ('world',)


class HistoryEventSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    coordinates = serializers.SerializerMethodField()
    participants_list = serializers.SerializerMethodField()

    class Meta:
        model = HistoryEvent
        fields = (
            'id',
            'world',
            'title',
            'description',
            'date',
            'created_at',
            'event_type',
            'game_day',
            'is_important',
            'epoch',
            'epoch_name',
            'coordinates',
            'image',
            'image_url',
            'participants',
            'participants_list',
        )
        read_only_fields = (
            'world',
            'created_at',
            'epoch_name',
            'image_url',
            'participants_list',
        )
        extra_kwargs = {
            'image': {'write_only': True, 'allow_null': True},
            'participants': {'required': False, 'allow_blank': True},
        }

    epoch_name = serializers.SerializerMethodField()

    def get_epoch_name(self, obj):
        return obj.epoch.name if obj.epoch else None

    def get_image_url(self, obj):
        url = obj.image_url
        if not url:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_coordinates(self, obj):
        return obj.coordinates

    def get_participants_list(self, obj):
        if not obj.participants:
            return []
        return [p.strip() for p in obj.participants.split(',') if p.strip()]


class EpochSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    events_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Epoch
        fields = (
            'id',
            'world',
            'name',
            'description',
            'start_date',
            'end_date',
            'created_at',
            'is_active',
            'events_count',
        )
        read_only_fields = ('world',) 



class WorldSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    owner_avatar_url = serializers.SerializerMethodField()
    players_count = serializers.IntegerField(source='players.count', read_only=True)
    locations_count = serializers.IntegerField(source='locations.count', read_only=True)
    todos_count = serializers.IntegerField(source='todos.count', read_only=True)
    todos_done = serializers.SerializerMethodField()
    history_count = serializers.IntegerField(source='history.count', read_only=True)
    epochs_count = serializers.IntegerField(source='epochs.count', read_only=True)
    cover_image_url = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = World
        fields = (
            'id',
            'owner',
            'owner_username',
            'owner_avatar_url',
            'name',
            'description',
            'seed',
            'start_date',
            'cover_image',
            'cover_image_url',
            'is_public',
            'theme',
            'created_at',
            'updated_at',
            'players_count',
            'locations_count',
            'todos_count',
            'todos_done',
            'history_count',
            'epochs_count',
            'current_user_role',
        )
        read_only_fields = ('owner',)

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            try:
                url = obj.cover_image.url
            except (ValueError, OSError):
                return None
            request = self.context.get('request')
            return request.build_absolute_uri(url) if request else url
        return None

    def get_owner_avatar_url(self, obj):
        try:
            if obj.owner.profile.avatar:
                url = obj.owner.profile.avatar.url
                request = self.context.get('request')
                return request.build_absolute_uri(url) if request else url
        except UserProfile.DoesNotExist:
            pass
        return None

    def get_todos_done(self, obj):
        return obj.todos.filter(is_done=True).count()

    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        from .permissions import get_user_role
        return get_user_role(request.user, obj)


class MembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    world_name = serializers.CharField(source='world.name', read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ('id', 'world', 'world_name', 'user', 'username', 'role', 'status', 'avatar_url')
        read_only_fields = ('world', 'user')

    def get_avatar_url(self, obj):
        try:
            if obj.user.profile.avatar:
                url = obj.user.profile.avatar.url
                request = self.context.get('request')
                return request.build_absolute_uri(url) if request else url
        except UserProfile.DoesNotExist:
            pass
        return None


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ('id', 'world', 'title', 'content', 'tags', 'created_at')
        read_only_fields = ('world',)


class ProjectSerializer(serializers.ModelSerializer):
    progress = serializers.IntegerField(read_only=True)
    todos_count = serializers.IntegerField(source='todos.count', read_only=True)
    todos_done = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ('id', 'world', 'title', 'description', 'status', 'progress', 'todos_count', 'todos_done', 'created_at')
        read_only_fields = ('world',)

    def get_todos_done(self, obj):
        return obj.todos.filter(is_done=True).count()


class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bookmark
        fields = ('id', 'world', 'title', 'url', 'description', 'created_at')
        read_only_fields = ('world',)


class IdeaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Idea
        fields = ('id', 'world', 'title', 'content', 'created_at')
        read_only_fields = ('world',)


class WikiPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WikiPage
        fields = (
            'id',
            'world',
            'title',
            'page_type',
            'content',
            'emoji',
            'infobox',
            'tags',
            'world_date',
            'world_date_order',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('world',)


class RelationshipSerializer(serializers.ModelSerializer):
    source_name = serializers.SerializerMethodField()
    target_name = serializers.SerializerMethodField()

    class Meta:
        model = Relationship
        fields = (
            'id',
            'world',
            'source_type',
            'source_id',
            'target_type',
            'target_id',
            'label',
            'source_name',
            'target_name',
            'created_at',
        )
        read_only_fields = ('world',)

    @staticmethod
    def get_entity_name(entity_type, entity_id):
        model = RELATION_MODEL_MAP.get(entity_type)
        if not model:
            return None
        try:
            return str(model.objects.get(pk=entity_id))
        except model.DoesNotExist:
            return None

    def get_source_name(self, obj):
        return self.get_entity_name(obj.source_type, obj.source_id)

    def get_target_name(self, obj):
        return self.get_entity_name(obj.target_type, obj.target_id)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get('request')
        world_id = None
        if request and getattr(request, 'resolver_match', None):
            world_id = request.resolver_match.kwargs.get('world_id')
        if world_id is None and self.instance:
            world_id = self.instance.world_id

        source_type = attrs.get('source_type', getattr(self.instance, 'source_type', None))
        source_id = attrs.get('source_id', getattr(self.instance, 'source_id', None))
        target_type = attrs.get('target_type', getattr(self.instance, 'target_type', None))
        target_id = attrs.get('target_id', getattr(self.instance, 'target_id', None))

        if world_id is not None:
            if source_type is not None and source_id is not None:
                self._check_exists(world_id, source_type, source_id, 'source')
            if target_type is not None and target_id is not None:
                self._check_exists(world_id, target_type, target_id, 'target')

        if (
            source_type is not None
            and source_id is not None
            and source_type == target_type
            and source_id == target_id
        ):
            raise serializers.ValidationError(
                'Не можна зв\'язати елемент із самим собою'
            )
        return attrs

    def _check_exists(self, world_id, entity_type, entity_id, field):
        model = RELATION_MODEL_MAP.get(entity_type)
        if model is None:
            raise serializers.ValidationError(
                {field: 'Невідомий тип елемента'}
            )
        if not model.objects.filter(world_id=world_id, pk=entity_id).exists():
            raise serializers.ValidationError(
                {field: 'Елемент не знайдено у цьому світі'}
            )


class UserPublicSerializer(serializers.ModelSerializer):
    worlds_count = serializers.SerializerMethodField()
    friends_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'display_name', 'bio', 'avatar_url', 'date_joined', 'worlds_count', 'friends_count')

    def get_worlds_count(self, obj):
        return obj.worlds.count()

    def get_friends_count(self, obj):
        from django.db.models import Q

        return Friendship.objects.filter(
            Q(user_a=obj, status=Friendship.Status.ACCEPTED)
            | Q(user_b=obj, status=Friendship.Status.ACCEPTED)
        ).count()

    def get_display_name(self, obj):
        try:
            return obj.profile.display_name
        except UserProfile.DoesNotExist:
            return ''

    def get_bio(self, obj):
        try:
            return obj.profile.bio
        except UserProfile.DoesNotExist:
            return ''

    def get_avatar_url(self, obj):
        try:
            if obj.profile.avatar:
                url = obj.profile.avatar.url
                request = self.context.get('request')
                return request.build_absolute_uri(url) if request else url
        except UserProfile.DoesNotExist:
            pass
        return None


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = ('id', 'username', 'email', 'display_name', 'bio', 'avatar')
        extra_kwargs = {
            'display_name': {'required': False},
            'bio': {'required': False},
            'avatar': {'required': False},
        }


class ProfileUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, max_length=150)
    display_name = serializers.CharField(required=False, max_length=100, allow_blank=True)
    bio = serializers.CharField(required=False, max_length=500, allow_blank=True)
    avatar = serializers.ImageField(required=False)

    def validate_username(self, value):
        value = value.strip().lower()
        if not USERNAME_RE.match(value):
            raise serializers.ValidationError(
                'Допустимі символи: букви, цифри, @ . + - _'
            )
        if len(value) < 3:
            raise serializers.ValidationError(
                'Мінімальна довжина — 3 символи'
            )
        user = self.context['request'].user
        if User.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                'Це ім\'я користувача вже зайняте'
            )
        return value

    def update(self, instance, validated_data):
        username = validated_data.get('username')
        if username:
            instance.username = username
            instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if 'display_name' in validated_data:
            profile.display_name = validated_data['display_name']
        if 'bio' in validated_data:
            profile.bio = validated_data['bio']
        if 'avatar' in validated_data:
            profile.avatar = validated_data['avatar']
        profile.save()

        return instance


class WorldAccessRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='requester.username', read_only=True)
    display_name = serializers.CharField(source='requester.profile.display_name', read_only=True, default='')
    avatar_url = serializers.SerializerMethodField()
    world_name = serializers.CharField(source='world.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WorldAccessRequest
        fields = ('id', 'world', 'world_name', 'requester', 'username', 'display_name', 'avatar_url', 'status', 'status_display', 'created_at')
        read_only_fields = ('requester', 'status')

    def get_avatar_url(self, obj):
        profile = getattr(obj.requester, 'profile', None)
        if profile and profile.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(profile.avatar.url)
            return profile.avatar.url
        return None


class NotificationSerializer(serializers.ModelSerializer):
    from_user_username = serializers.CharField(source='from_user.username', read_only=True, default='')
    from_user_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'notification_type', 'from_user', 'from_user_username', 'from_user_avatar_url', 'message', 'is_read', 'created_at')

    def get_from_user_avatar_url(self, obj):
        if not obj.from_user:
            return None
        try:
            if obj.from_user.profile.avatar:
                url = obj.from_user.profile.avatar.url
                request = self.context.get('request')
                return request.build_absolute_uri(url) if request else url
        except UserProfile.DoesNotExist:
            pass
        return None


class FriendshipSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Friendship
        fields = ('id', 'user_a', 'user_b', 'status', 'status_display', 'other_user', 'created_at', 'updated_at')

    def get_other_user(self, obj):
        request_user = self.context.get('request')
        if not request_user:
            return None
        other = obj.get_other_user(request_user)
        return UserPublicSerializer(other).data
