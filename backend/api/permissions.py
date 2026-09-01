from rest_framework.permissions import BasePermission

from .models import Membership


def _get_world(obj):
    world = getattr(obj, 'world', None)
    if world is None and hasattr(obj, 'owner'):
        world = obj
    if world is None and hasattr(obj, 'location'):
        world = obj.location.world
    return world


def get_user_role(user, world):
    if world.owner_id == user.id:
        return Membership.Role.OWNER
    membership = world.memberships.filter(user=user, status='active').first()
    return membership.role if membership else None


class IsOwnerOrMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = _get_world(obj)
        if world is None:
            return False
        if world.owner_id == request.user.id:
            return True
        return world.memberships.filter(
            user=request.user, status='active'
        ).exists()

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsWorldOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = _get_world(obj)
        if world is None:
            return False
        return world.owner_id == request.user.id

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsWorldEditorOrAbove(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = _get_world(obj)
        if world is None:
            return False
        role = get_user_role(request.user, world)
        return role in (Membership.Role.OWNER, Membership.Role.EDITOR)

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsWorldViewerOrAbove(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = _get_world(obj)
        if world is None:
            return False
        role = get_user_role(request.user, world)
        return role is not None

    def has_permission(self, request, view):
        return request.user.is_authenticated
