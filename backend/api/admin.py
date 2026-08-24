from django.contrib import admin

from .models import (
    Bookmark,
    HistoryEvent,
    Idea,
    InspirationImage,
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

admin.site.register(World)
admin.site.register(Player)
admin.site.register(Location)
admin.site.register(LocationScreenshot)
admin.site.register(TodoItem)
admin.site.register(HistoryEvent)
admin.site.register(Membership)
admin.site.register(Note)
admin.site.register(Project)
admin.site.register(Bookmark)
admin.site.register(Idea)
admin.site.register(InspirationImage)
admin.site.register(WikiPage)
admin.site.register(Relationship)
