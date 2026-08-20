from rest_framework.routers import DefaultRouter

from .views import WorldViewSet

router = DefaultRouter()
router.register('worlds', WorldViewSet, basename='world')

urlpatterns = router.urls
