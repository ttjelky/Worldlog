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

    class Theme(models.TextChoices):
        SULFUR_CAVES = 'sulfur_caves', 'Сіркові печери'
        AMETHYST = 'amethyst', 'Аметистова'
        TRIAL_PALACE = 'trial_palace', 'Палац випробувань'

    theme = models.CharField(
        max_length=20, choices=Theme.choices, default=Theme.SULFUR_CAVES
    )
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
        FARM = 'farm', 'Farm'
        MINE = 'mine', 'Mine'
        TOWN = 'town', 'Town'
        BASE = 'base', 'Base'
        STRUCTURE = 'structure', 'Structure'
        BIOME = 'biome', 'Biome'
        BUILD = 'build', 'Build'
        POI = 'poi', 'Point of interest'
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


class Project(models.Model):
    class Status(models.TextChoices):
        PLANNING = 'planning', 'Planning'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        ON_HOLD = 'on_hold', 'On Hold'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def progress(self):
        todos = self.todos.all()
        if not todos:
            return 0
        done = todos.filter(is_done=True).count()
        return round(done / todos.count() * 100)


class TodoItem(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='todos')
    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='todos'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_done = models.BooleanField(default=False)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

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


class Note(models.Model):
    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    tags = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Bookmark(models.Model):
    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='bookmarks')
    title = models.CharField(max_length=200)
    url = models.URLField(max_length=500)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Idea(models.Model):
    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='ideas')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class WikiPage(models.Model):
    class PageType(models.TextChoices):
        LOCATION = 'location', 'Location'
        CHARACTER = 'character', 'Character'
        FACTION = 'faction', 'Faction'
        KINGDOM = 'kingdom', 'Kingdom'
        REGION = 'region', 'Region'
        ITEM = 'item', 'Item'
        EVENT = 'event', 'Event'
        WAR = 'war', 'War'
        CUSTOM = 'custom', 'Custom'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='wiki_pages')
    title = models.CharField(max_length=200)
    page_type = models.CharField(
        max_length=20, choices=PageType.choices, default=PageType.CUSTOM
    )
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']
        unique_together = ('world', 'title')

    def __str__(self):
        return self.title


class Relationship(models.Model):
    class SourceType(models.TextChoices):
        LOCATION = 'location', 'Location'
        WIKI_PAGE = 'wiki_page', 'Wiki Page'
        PROJECT = 'project', 'Project'
        TODO = 'todo', 'Todo'
        EVENT = 'event', 'Event'
        NOTE = 'note', 'Note'

    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='relationships')
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    source_id = models.PositiveIntegerField()
    target_type = models.CharField(max_length=20, choices=SourceType.choices)
    target_id = models.PositiveIntegerField()
    label = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('world', 'source_type', 'source_id', 'target_type', 'target_id')

    def __str__(self):
        return f'{self.source_type}:{self.source_id} -> {self.target_type}:{self.target_id}'


class Friendship(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        BLOCKED = 'blocked', 'Blocked'

    user_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='friendships_as_a'
    )
    user_b = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='friendships_as_b'
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('user_a', 'user_b')

    def __str__(self):
        return f'{self.user_a} <-> {self.user_b} ({self.status})'

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.user_a_id and self.user_b_id and self.user_a_id == self.user_b_id:
            raise ValidationError('Cannot create friendship with yourself.')

    def get_other_user(self, user):
        if user.id == self.user_a_id:
            return self.user_b
        if user.id == self.user_b_id:
            return self.user_a
        raise ValueError('User is not part of this friendship')


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile'
    )
    display_name = models.CharField(max_length=100, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='user_avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile of {self.user.username}'


class Notification(models.Model):
    class Type(models.TextChoices):
        FRIEND_REQUEST = 'friend_request', 'Friend Request'
        FRIEND_ACCEPTED = 'friend_accepted', 'Friend Accepted'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=Type.choices)
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications_from',
        null=True, blank=True
    )
    message = models.CharField(max_length=300)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.notification_type} for {self.user.username}'


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
