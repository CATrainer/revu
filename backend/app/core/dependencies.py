"""
Dependency injection container for services.

This module provides a centralized way to manage service dependencies
and ensures singleton instances where appropriate.
"""

from functools import lru_cache
from typing import Optional

from app.services.template_engine import TemplateEngine
from app.services.claude_service import ClaudeService
from app.services.ab_testing import ABTestingService
from app.services.rule_scheduler import RuleScheduler
from app.services.automation_learning import AutomationLearningService
from app.services.rule_performance import RulePerformanceService
from app.services.prediction_engine import PredictionEngine
from app.services.auto_learning import AutoLearningService
from app.services.digest import DigestService
from app.services.ab_monitor import ABTestMonitorService
from app.services.approval_queue import ApprovalQueueService
from app.services.nl_rule_parser import NaturalLanguageRuleParser
from app.services.oauth_service import OAuthService
from app.services.youtube_service import YouTubeService
from app.services.early_warning import EarlyWarningService
from app.services.polling_service import PollingService


class ServiceContainer:
    """Centralized service container with lazy initialization."""
    
    def __init__(self):
        self._services = {}
    
    @lru_cache(maxsize=None)
    def get_template_engine(self) -> TemplateEngine:
        return TemplateEngine()
    
    @lru_cache(maxsize=None)
    def get_claude_service(self) -> ClaudeService:
        return ClaudeService()
    
    @lru_cache(maxsize=None)
    def get_ab_testing_service(self) -> ABTestingService:
        return ABTestingService()
    
    @lru_cache(maxsize=None)
    def get_rule_scheduler(self) -> RuleScheduler:
        return RuleScheduler()
    
    @lru_cache(maxsize=None)
    def get_automation_learning_service(self) -> AutomationLearningService:
        return AutomationLearningService()
    
    @lru_cache(maxsize=None)
    def get_rule_performance_service(self) -> RulePerformanceService:
        return RulePerformanceService()
    
    @lru_cache(maxsize=None)
    def get_prediction_engine(self) -> PredictionEngine:
        return PredictionEngine()
    
    @lru_cache(maxsize=None)
    def get_auto_learning_service(self) -> AutoLearningService:
        return AutoLearningService()
    
    @lru_cache(maxsize=None)
    def get_digest_service(self) -> DigestService:
        return DigestService()
    
    @lru_cache(maxsize=None)
    def get_ab_monitor_service(self) -> ABTestMonitorService:
        return ABTestMonitorService()
    
    @lru_cache(maxsize=None)
    def get_approval_queue_service(self) -> ApprovalQueueService:
        return ApprovalQueueService()
    
    @lru_cache(maxsize=None)
    def get_nl_rule_parser(self) -> NaturalLanguageRuleParser:
        return NaturalLanguageRuleParser()
    
    @lru_cache(maxsize=None)
    def get_oauth_service(self) -> OAuthService:
        return OAuthService()
    
    @lru_cache(maxsize=None)
    def get_youtube_service(self) -> YouTubeService:
        return YouTubeService()
    
    @lru_cache(maxsize=None)
    def get_early_warning_service(self) -> EarlyWarningService:
        return EarlyWarningService()
    
    @lru_cache(maxsize=None)
    def get_polling_service(self) -> PollingService:
        return PollingService()


# Global service container instance
_container: Optional[ServiceContainer] = None


def get_service_container() -> ServiceContainer:
    """Get the global service container instance."""
    global _container
    if _container is None:
        _container = ServiceContainer()
    return _container


# Convenience functions for FastAPI dependency injection
def get_template_engine() -> TemplateEngine:
    return get_service_container().get_template_engine()


def get_claude_service() -> ClaudeService:
    return get_service_container().get_claude_service()


def get_ab_testing_service() -> ABTestingService:
    return get_service_container().get_ab_testing_service()


def get_rule_scheduler() -> RuleScheduler:
    return get_service_container().get_rule_scheduler()


def get_automation_learning_service() -> AutomationLearningService:
    return get_service_container().get_automation_learning_service()


def get_rule_performance_service() -> RulePerformanceService:
    return get_service_container().get_rule_performance_service()


def get_prediction_engine() -> PredictionEngine:
    return get_service_container().get_prediction_engine()


def get_auto_learning_service() -> AutoLearningService:
    return get_service_container().get_auto_learning_service()


def get_digest_service() -> DigestService:
    return get_service_container().get_digest_service()


def get_ab_monitor_service() -> ABTestMonitorService:
    return get_service_container().get_ab_monitor_service()


def get_approval_queue_service() -> ApprovalQueueService:
    return get_service_container().get_approval_queue_service()


def get_nl_rule_parser() -> NaturalLanguageRuleParser:
    return get_service_container().get_nl_rule_parser()


def get_oauth_service() -> OAuthService:
    return get_service_container().get_oauth_service()


def get_youtube_service() -> YouTubeService:
    return get_service_container().get_youtube_service()


def get_early_warning_service() -> EarlyWarningService:
    return get_service_container().get_early_warning_service()


def get_polling_service() -> PollingService:
    return get_service_container().get_polling_service()
