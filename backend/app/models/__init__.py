"""Models package."""

from app.models.organization import Organization
from app.models.background_job import BackgroundJob
from app.models.session import UserSession
from app.models.location import Location
from app.models.user import User
from app.models.platform import PlatformConnection
from app.models.automation import AutomationRule
from app.models.template import ResponseTemplate
from app.models.analytics import AnalyticsSnapshot
from app.models.ai_training import AITrainingData
from app.models.ai_context import UserAIContext
from app.models.audit import AuditLog
from app.models.workflow import Workflow, WorkflowApproval
from app.models.youtube import (
    YouTubeConnection,
    YouTubeVideo,
    YouTubeComment,
    OAuthStateToken,
    SyncLog,
)
from app.models.chat import ChatSession, ChatMessage, session_tags
from app.models.chat_enhancements import (
    Tag,
    Attachment,
    SessionShare,
    SessionCollaborator,
    MessageComment,
)
from app.models.interaction import Interaction
from app.models.thread import InteractionThread
from app.models.view import InteractionView
from app.models.fan import Fan
from app.models.analytics import InteractionAnalytics
from app.models.user_feedback import UserFeedback
from app.models.content import (
    ContentPiece,
    ContentPerformance,
    ContentInsight,
    ContentTheme,
    ActionPlan,
    ActionItem,
)
from app.models.application import Application, AdminNotificationSettings
from app.models.monetization import CreatorProfile
from app.models.agency import Agency, AgencyMember, AgencyInvitation
from app.models.agency_opportunity import AgencyOpportunity
from app.models.credit_usage import (
    CreditUsageEvent,
    UserCreditBalance,
    CreditActionCost,
    ActionType,
)
from app.models.agency_campaign import (
    AgencyCampaign,
    CampaignCreator,
    CampaignDeliverable,
    AgencyDeal,
    DealCreator,
)
from app.models.agency_finance import (
    AgencyInvoice,
    CreatorPayout,
    AgencyCreatorProfile,
    CreatorGroup,
    CreatorGroupMember,
    CreatorAvailability,
)
from app.models.agency_notification import (
    AgencyNotification,
    AgencyActivity,
    AgencyReport,
    AgencyTask,
)
from app.models.creator_tools import (
    Notification,
    NotificationPreference,
    BrandDeal,
    ContentCalendarEntry,
    CreatorInsight,
    MediaKit,
    CreatorRateCard,
    PostingTimeAnalysis,
)
from app.models.notification import (
    CreatorNotification,
    NotificationPreference as NotificationPreferenceV2,
    NotificationDeliveryLog,
    CREATOR_NOTIFICATION_TYPES,
    AGENCY_NOTIFICATION_TYPES,
    NOTIFICATION_CATEGORIES,
)

__all__ = [
    "Organization",
    "Location",
    "User",
    "BackgroundJob",
    "UserSession",
    "PlatformConnection",
    "AutomationRule",
    "ResponseTemplate",
    "AnalyticsSnapshot",
    "AITrainingData",
    "UserAIContext",
    "AuditLog",
    "Workflow",
    "WorkflowApproval",
    "YouTubeConnection",
    "YouTubeVideo",
    "YouTubeComment",
    "OAuthStateToken",
    "SyncLog",
    "ChatSession",
    "ChatMessage",
    "Tag",
    "Attachment",
    "SessionShare",
    "SessionCollaborator",
    "MessageComment",
    "session_tags",
    "Interaction",
    "InteractionThread",
    "InteractionView",
    "Fan",
    "InteractionAnalytics",
    "UserFeedback",
    "ContentPiece",
    "ContentPerformance",
    "ContentInsight",
    "ContentTheme",
    "ActionPlan",
    "ActionItem",
    "Application",
    "AdminNotificationSettings",
    "CreatorProfile",
    "Agency",
    "AgencyMember",
    "AgencyInvitation",
    "AgencyOpportunity",
    "CreditUsageEvent",
    "UserCreditBalance",
    "CreditActionCost",
    "ActionType",
    # Agency Dashboard Models
    "AgencyCampaign",
    "CampaignCreator",
    "CampaignDeliverable",
    "AgencyDeal",
    "DealCreator",
    "AgencyInvoice",
    "CreatorPayout",
    "AgencyCreatorProfile",
    "CreatorGroup",
    "CreatorGroupMember",
    "CreatorAvailability",
    "AgencyNotification",
    "AgencyActivity",
    "AgencyReport",
    "AgencyTask",
    "Notification",
    "NotificationPreference",
    "BrandDeal",
    "ContentCalendarEntry",
    "CreatorInsight",
    "MediaKit",
    "CreatorRateCard",
    "PostingTimeAnalysis",
    # New Notification System
    "CreatorNotification",
    "NotificationPreferenceV2",
    "NotificationDeliveryLog",
    "CREATOR_NOTIFICATION_TYPES",
    "AGENCY_NOTIFICATION_TYPES",
    "NOTIFICATION_CATEGORIES",
]