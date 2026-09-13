from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Membership, World


def _get_world(obj):
    world = getattr(obj, 'world', None)
    if world is None and hasattr(obj, 'owner'):
        world = obj
    if world is None and hasattr(obj, 'location'):
        world = obj.location.world
    return world


def _get_world_from_view(view):
    """Світ із URL (.../worlds/<world_id>/...). None — поза контекстом світу."""
    world_id = getattr(view, 'kwargs', {}).get('world_id')
    if not world_id:
        return None
    return World.objects.filter(pk=world_id).first()


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
        if not request.user.is_authenticated:
            return False
        world_id = getattr(view, 'kwargs', {}).get('world_id')
        if not world_id:
            # Поза контекстом світу (список світів, друзі, пошук) —
            # фільтрація за доступом відбувається в queryset в'ю.
            return True
        world = _get_world_from_view(view)
        if world is None:
            # Світ не існує — забороняємо (в'ю поверне 404/403, але не витік).
            return False
        if world.owner_id == request.user.id:
            return True
        return world.memberships.filter(
            user=request.user, status='active'
        ).exists()


class IsWorldOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = _get_world(obj)
        if world is None:
            return False
        return world.owner_id == request.user.id

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            # Читання поза контекстом світу дозволене лише якщо в'ю
            # сама фільтрує queryset (напр. список своїх світів).
            # Для вкладених в'ю зі world_id перевіряємо членство одразу,
            # бо has_object_permission на list не викликається.
            world_id = getattr(view, 'kwargs', {}).get('world_id')
            if not world_id:
                return True
            world = _get_world_from_view(view)
            if world is None:
                return False
            return get_user_role(request.user, world) is not None
        world = _get_world_from_view(view)
        if world is None:
            # Unsafe без контексту світу — забороняємо за замовчуванням,
            # конкретна в'ю має дати явний дозвіл.
            return False
        return world.owner_id == request.user.id


class IsWorldEditorOrAbove(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = _get_world(obj)
        if world is None:
            return False
        role = get_user_role(request.user, world)
        return role in (Membership.Role.OWNER, Membership.Role.EDITOR)

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            world_id = getattr(view, 'kwargs', {}).get('world_id')
            if not world_id:
                return True
            world = _get_world_from_view(view)
            if world is None:
                return False
            return get_user_role(request.user, world) is not None
        world = _get_world_from_view(view)
        if world is None:
            return False
        role = get_user_role(request.user, world)
        return role in (Membership.Role.OWNER, Membership.Role.EDITOR)


class IsWorldViewerOrAbove(BasePermission):
    def has_object_permission(self, request, view, obj):
        world = _get_world(obj)
        if world is None:
            return False
        role = get_user_role(request.user, world)
        return role is not None

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        world_id = getattr(view, 'kwargs', {}).get('world_id')
        if not world_id:
            return True
        world = _get_world_from_view(view)
        if world is None:
            return False
        return get_user_role(request.user, world) is not None
