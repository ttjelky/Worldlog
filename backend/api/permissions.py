from rest_framework.permissions import BasePermission


class IsOwnerOrMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = getattr(obj, 'world', None)
        if world is None and hasattr(obj, 'owner'):
            world = obj
        if world is None and hasattr(obj, 'location'):
            world = obj.location.world
        if world is None:
            return False
        if world.owner_id == request.user.id:
            return True
        return world.memberships.filter(
            user=request.user, status='active'
        ).exists()

    def has_permission(self, request, view):
        return request.user.is_authenticated
