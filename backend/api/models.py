from django.db import models


class World(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
