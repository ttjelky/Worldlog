from django.conf import settings
from django.db import models


class World(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='worlds'
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    seed = models.CharField(max_length=200, blank=True)
    start_date = models.DateField(null=True, blank=True)
    cover_image = models.ImageField(upload_to='world_covers/', blank=True, null=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Player(models.Model):
    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='players')
    nickname = models.CharField(max_length=100)
    role_note = models.CharField(max_length=200, blank=True)
    avatar = models.ImageField(upload_to='player_avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nickname']

    def __str__(self):
        return self.nickname


class Location(models.Model):
    class Category(models.TextChoices):
        BASE = 'base', 'Base'
        FARM = 'farm', 'Farm'
        MINE = 'mine', 'Mine'
        BUILD = 'build', 'Build'
        VILLAGE = 'village', 'Village'
        TEMPLE = 'temple', 'Temple'
        OTHER = 'other', 'Other'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    x = models.IntegerField()
    y = models.IntegerField()
    z = models.IntegerField()
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class LocationScreenshot(models.Model):
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name='screenshots'
    )
    image = models.ImageField(upload_to='location_screenshots/')
    created_at = models.DateTimeField(auto_now_add=True)


class TodoItem(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='todos')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_done = models.BooleanField(default=False)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['is_done', '-priority', 'due_date']

    def __str__(self):
        return self.title


class HistoryEvent(models.Model):
    class Category(models.TextChoices):
        ACHIEVEMENT = 'achievement', 'Achievement'
        MILESTONE = 'milestone', 'Milestone'
        IMPORTANT = 'important', 'Important'
        COMPLETED = 'completed', 'Completed'
        EXPANSION = 'expansion', 'Expansion'
        OTHER = 'other', 'Other'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='history')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'created_at']


class Membership(models.Model):
    class Role(models.TextChoices):
        OWNER = 'owner', 'Owner'
        EDITOR = 'editor', 'Editor'
        VIEWER = 'viewer', 'Viewer'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships'
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('world', 'user')