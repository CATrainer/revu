"""Demo data generation service for personas and fake activity."""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.demo import DemoAccount, DemoComment, DemoContent


class DemoDataService:
    """Generate and manage demo data for different personas."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ---- Public API ----
    async def initialize_persona(self, user_email: str, persona_type: str) -> DemoAccount:
        """Create or reset a demo account for a user and seed 30-60 days of data."""
        logger.info(f"Initializing demo persona '{persona_type}' for {user_email}")

        # Remove existing demo for this email
        existing = await self.db.execute(
            select(DemoAccount).where(DemoAccount.email == user_email)
        )
        account = existing.scalar_one_or_none()
        if account:
            await self._wipe_account(account)

        account = DemoAccount(
            email=user_email,
            persona_type=persona_type,
            platform_data=self._platform_seed(persona_type),
            content_schedule=self._content_schedule(persona_type),
            engagement_patterns=self._engagement_patterns(persona_type),
        )
        self.db.add(account)
        await self.db.flush()

        # Seed content and historical comments (30-60 days)
        await self._seed_content_and_comments(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def simulate_new_activity(self, account: DemoAccount, count: int = 8) -> dict[str, Any]:
        """Generate a small batch of new comments across recent content."""
        logger.debug(f"Simulating {count} new comments for {account.email}")
        recent_contents = await self._get_recent_content(account, days=7)
        if not recent_contents:
            return {"created": 0}

        created = 0
        for _ in range(count):
            content = random.choice(recent_contents)
            comment = self._make_comment_for_platform(account.persona_type, content.platform)
            comment.content = content  # type: ignore[attr-defined]
            demo_comment = DemoComment(
                content_id=content.id,
                author_name=comment["author_name"],
                author_avatar=comment["author_avatar"],
                comment_text=comment["text"],
                sentiment=comment["sentiment"],
                is_verified=comment["verified"],
                likes_count=comment["likes"],
                replies_count=comment["replies"],
                published_at=datetime.utcnow(),
                response=comment.get("response"),
                response_at=datetime.utcnow() if comment.get("response") else None,
            )
            self.db.add(demo_comment)
            created += 1

        await self.db.commit()
        return {"created": created}

    async def reset_account(self, user_email: str) -> bool:
        res = await self.db.execute(select(DemoAccount).where(DemoAccount.email == user_email))
        account = res.scalar_one_or_none()
        if not account:
            return False
        await self._wipe_account(account)
        await self.db.commit()
        return True

    # ---- Internals ----
    async def _wipe_account(self, account: DemoAccount) -> None:
        # Relationships have cascade delete; deleting account clears child rows
        await self.db.delete(account)
        await self.db.flush()

    async def _seed_content_and_comments(self, account: DemoAccount) -> None:
        # 10-25 content items over the last 60 days
        content_count = random.randint(10, 25)
        now = datetime.utcnow()
        contents: list[DemoContent] = []
        for i in range(content_count):
            platform = random.choice(self._platforms_for_persona(account.persona_type))
            published_at = now - timedelta(days=random.randint(1, 60), hours=random.randint(0, 23))
            content = DemoContent(
                account_id=account.id,
                platform=platform,
                content_type=self._content_type_for_platform(platform),
                title=self._content_title(account.persona_type, platform, i),
                thumbnail_url=self._thumbnail_for_platform(platform, i),
                metrics=self._initial_metrics(platform),
                published_at=published_at,
            )
            self.db.add(content)
            contents.append(content)

        await self.db.flush()

        # Create comments with time-based decay (spike near publish, taper off)
        for content in contents:
            age_days = (now - content.published_at).days if content.published_at else 0
            base = 80 if age_days < 3 else max(5, 60 - age_days)
            total_comments = random.randint(max(3, base // 2), base)
            for _ in range(total_comments):
                # time offset clustered closer to publish time
                offset_hours = abs(random.gauss(mu=6, sigma=12))
                ts = (content.published_at or now) + timedelta(hours=offset_hours)
                comment = self._make_comment_for_platform(account.persona_type, content.platform)
                demo_comment = DemoComment(
                    content_id=content.id,
                    author_name=comment["author_name"],
                    author_avatar=comment["author_avatar"],
                    comment_text=comment["text"],
                    sentiment=comment["sentiment"],
                    is_verified=comment["verified"],
                    likes_count=comment["likes"],
                    replies_count=comment["replies"],
                    published_at=ts,
                    response=comment.get("response"),
                    response_at=ts + timedelta(hours=random.randint(1, 72)) if comment.get("response") else None,
                )
                self.db.add(demo_comment)

    def _platform_seed(self, persona: str) -> dict[str, Any]:
        if persona in ("creator", "creator_beauty", "agency_creators"):
            return {
                "instagram": {"followers": 487_000, "engagement_rate": 4.8},
                "youtube": {"subscribers": 892_000, "avg_views": 350_000},
                "tiktok": {"followers": 620_000, "avg_views": 410_000},
            }
        if persona == "creator_gaming":
            return {
                "youtube": {"subscribers": 892_000, "avg_views": 380_000},
                "twitch": {"followers": 210_000, "avg_viewers": 5400},
                "instagram": {"followers": 120_000, "engagement_rate": 3.2},
            }
        if persona == "agency_businesses":
            return {
                "google": {"avg_rating": 4.4, "reviews": 1240},
                "yelp": {"avg_rating": 4.0, "reviews": 680},
                "tripadvisor": {"avg_rating": 4.2, "reviews": 540},
            }
        # default mixed
        return {
            "instagram": {"followers": 120_000, "engagement_rate": 3.1},
            "youtube": {"subscribers": 200_000, "avg_views": 80_000},
            "google": {"avg_rating": 4.5, "reviews": 300},
        }

    def _content_schedule(self, persona: str) -> dict[str, Any]:
        if persona in ("creator", "creator_beauty", "agency_creators"):
            return {"posts_per_day": random.choice([1, 2]), "best_hours": [9, 12, 18]}
        if persona == "agency_businesses":
            return {"posts_per_week": 4, "best_hours": [11, 19]}
        if persona == "creator_gaming":
            return {"uploads_per_day": 1, "streams_per_week": 3, "best_hours": [16, 20, 22]}
        return {"posts_per_week": 5, "best_hours": [10, 14, 20]}

    def _engagement_patterns(self, persona: str) -> dict[str, Any]:
        return {
            "spike_minutes": [0, 10, 20, 60],
            "taper_days": [1, 2, 3, 7],
            "verified_share": 0.03 if persona.startswith("agency") else 0.08,
        }

    def _platforms_for_persona(self, persona: str) -> list[str]:
        if persona in ("creator", "creator_beauty", "agency_creators"):
            return ["YouTube", "Instagram", "TikTok"]
        if persona == "creator_gaming":
            return ["YouTube", "Instagram"]
        if persona == "agency_businesses":
            return ["Google", "Yelp", "TripAdvisor"]
        return ["YouTube", "Instagram", "TikTok", "Google"]

    def _content_type_for_platform(self, platform: str) -> str:
        return {
            "YouTube": random.choice(["video", "short"]),
            "Instagram": random.choice(["post", "reel", "story"]),
            "TikTok": "short",
            "Google": "post",
            "Yelp": "post",
            "TripAdvisor": "post",
        }.get(platform, "post")

    def _content_title(self, persona: str, platform: str, i: int) -> str:
        if platform == "YouTube" and persona == "creator_gaming":
            return [
                "Pro Settings Revealed (2025)",
                "Speedrun Attempt — New PB?",
                "Ultimate Graphics Guide",
            ][i % 3]
        if platform == "YouTube":
            return [
                "Ranked My Top 10 Games of 2025",
                "Ultimate Setup Tour",
                "Pro Tips You Need to Know",
            ][i % 3]
        if platform == "Instagram":
            if persona in ("creator", "creator_beauty", "agency_creators"):
                return [
                    "Morning Glow Routine",
                    "Budget-Friendly Makeup Hacks",
                    "Behind the Scenes Shoot",
                ][i % 3]
            return ["Setup Sneak Peek", "Controller Mods", "Stream Highlights"][i % 3]
        if platform == "TikTok":
            return ["Quick Tip You’ll Love", "Before/After", "Try This Trend!"][i % 3]
        return ["Customer Spotlight", "Weekly Update", "Promotion Day"][i % 3]

    def _thumbnail_for_platform(self, platform: str, i: int) -> str:
        base = "https://picsum.photos/seed"
        return f"{base}/{platform}-{i}/640/360"

    def _initial_metrics(self, platform: str) -> dict[str, Any]:
        if platform == "YouTube":
            return {"views": random.randint(50_000, 500_000), "likes": random.randint(2_000, 30_000), "shares": random.randint(100, 2_000)}
        if platform == "Instagram":
            return {"views": random.randint(20_000, 300_000), "likes": random.randint(1_000, 20_000), "shares": random.randint(50, 1_000)}
        if platform == "TikTok":
            return {"views": random.randint(80_000, 800_000), "likes": random.randint(3_000, 50_000), "shares": random.randint(200, 5_000)}
        return {"views": random.randint(50, 2_000), "likes": random.randint(0, 200), "shares": random.randint(0, 50)}

    def _make_comment_for_platform(self, persona: str, platform: str) -> dict[str, Any]:
        # library of patterns
        def author() -> tuple[str, str, bool]:
            verified = random.random() < (0.1 if persona in ("creator", "agency_creators") else 0.03)
            name = random.choice([
                "Sarah Chen",
                "AceGamer",
                "BrandCollab Co.",
                "Daily Viewer",
                "Mia López",
                "TechTuber Tim",
            ])
            avatar = f"https://i.pravatar.cc/150?u={name.replace(' ', '_')}"
            return name, avatar, verified

        sentiments = ["positive", "negative", "neutral", "question", "spam"]
        sentiment_weights = [0.55, 0.1, 0.2, 0.12, 0.03]
        sentiment = random.choices(sentiments, weights=sentiment_weights, k=1)[0]

        text = "Nice!"
        if platform == "YouTube":
            text = random.choice([
                "First!",
                "What's your setup?" if persona == "creator_gaming" else "What lens is this?",
                "Do a collab with @ProPlayer" if persona == "creator_gaming" else "Collab with @Brand?",
                "This strat still works in 1.2.3?" if persona == "creator_gaming" else "Link to products?",
                "Timestamp pls",
            ])
        elif platform == "Instagram":
            text = random.choice([
                "WHERE IS THIS FROM?" if persona in ("creator", "creator_beauty", "agency_creators") else "Where did you get that controller?",
                "Tutorial please!",
                "You're glowing! ✨" if persona in ("creator", "creator_beauty", "agency_creators") else "Setup pic pls!",
                "Collab DM?",
                "Link in bio?",
            ])
        elif platform == "TikTok":
            text = random.choice([
                "POV: I needed this",
                "Algorithm brought me here",
                "Low-key obsessed",
                "Pls drop product list 🙏",
            ])
        else:
            text = random.choice([
                "Great service",
                "Food was cold",
                "Parking is tough but worth it",
                "Manager resolved my issue quickly",
                "Would recommend!",
            ])

        # sentiment adjustments
        if sentiment == "question":
            text += "?"
        elif sentiment == "spam":
            text = "Check my profile for free giveaways!!!"

        name, avatar, verified = author()
        response = None
        if random.random() < 0.35:  # some comments get replies
            response = random.choice([
                "Thanks for the love!",
                "Great question—posting a follow-up soon.",
                "DM us and we’ll share details.",
                "Appreciate the feedback!",
            ])

        return {
            "author_name": name,
            "author_avatar": avatar,
            "verified": verified,
            "text": text,
            "sentiment": sentiment.capitalize(),
            "likes": random.randint(0, 2000),
            "replies": random.randint(0, 8),
            "response": response,
        }

    async def _get_recent_content(self, account: DemoAccount, days: int = 7) -> list[DemoContent]:
        since = datetime.utcnow() - timedelta(days=days)
        res = await self.db.execute(
            select(DemoContent).where(
                DemoContent.account_id == account.id,
                DemoContent.published_at >= since,
            )
        )
        return list(res.scalars())
