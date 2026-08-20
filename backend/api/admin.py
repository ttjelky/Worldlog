from django.contrib import admin

from .models import (
    HistoryEvent,
    Location,
    LocationScreenshot,
    Membership,
    Player,
    TodoItem,
    World,
)

admin.site.register(World)
admin.site.register(Player)
admin.site.register(Location)
admin.site.register(LocationScreenshot)
admin.site.register(TodoItem)
admin.site.register(HistoryEvent)
admin.site.register(Membership)