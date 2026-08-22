import re

from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    HistoryEvent,
    Location,
    LocationScreenshot,
    Membership,
    Player,
    TodoItem,
    World,
)


class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        if 'username' in attrs:
            attrs['username'] = attrs['username'].strip().lower()
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


class LocationScreenshotSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = LocationScreenshot
        fields = ('id', 'image')

    def get_image(self, obj):
        request = self.context.get('request')
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


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
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = ('id', 'world', 'nickname', 'role_note', 'avatar')
        read_only_fields = ('world',)

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            url = obj.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None


class TodoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoItem
        fields = (
            'id',
            'world',
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
            url = obj.cover_image.url
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
