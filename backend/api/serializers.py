from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    HistoryEvent,
    Location,
    LocationScreenshot,
    Membership,
    Player,
    TodoItem,
    World,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        return user


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
