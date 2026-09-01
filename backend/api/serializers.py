import re

from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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
    class Meta:
        model = HistoryEvent
        fields = ('id', 'world', 'title', 'description', 'date', 'category')
        read_only_fields = ('world',)


class WorldSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    players_count = serializers.IntegerField(source='players.count', read_only=True)
    locations_count = serializers.IntegerField(source='locations.count', read_only=True)
    todos_count = serializers.IntegerField(source='todos.count', read_only=True)
    todos_done = serializers.SerializerMethodField()
    history_count = serializers.IntegerField(source='history.count', read_only=True)
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = World
        fields = (
            'id',
            'owner',
            'owner_username',
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

    def get_todos_done(self, obj):
        return obj.todos.filter(is_done=True).count()


class MembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    world_name = serializers.CharField(source='world.name', read_only=True)

    class Meta:
        model = Membership
        fields = ('id', 'world', 'world_name', 'user', 'username', 'role', 'status')
        read_only_fields = ('world', 'user')


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
        fields = ('id', 'world', 'title', 'page_type', 'content', 'created_at', 'updated_at')
        read_only_fields = ('world',)


class RelationshipSerializer(serializers.ModelSerializer):
    target_name = serializers.SerializerMethodField()

    class Meta:
        model = Relationship
        fields = ('id', 'world', 'source_type', 'source_id', 'target_type', 'target_id', 'label', 'target_name', 'created_at')
        read_only_fields = ('world',)

    def get_target_name(self, obj):
        model_map = {
            'location': Location,
            'wiki_page': WikiPage,
            'project': Project,
            'todo': TodoItem,
            'event': HistoryEvent,
            'note': Note,
        }
        model = model_map.get(obj.target_type)
        if not model:
            return None
        try:
            instance = model.objects.get(pk=obj.target_id)
            return str(instance)
        except model.DoesNotExist:
            return None
