"""Demo content data seeder for insights dashboard."""

from datetime import datetime, timedelta
from uuid import UUID, uuid4
import random
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.content import ContentPiece, ContentPerformance, ContentInsight, ContentTheme


async def seed_demo_content(db: AsyncSession, user_id: UUID) -> dict:
    """
    Seed realistic demo content data for the insights dashboard.
    
    Creates:
    - 15-20 ContentPieces across YouTube, Instagram, TikTok
    - Performance metrics for each piece
    - AI-generated insights
    - Theme aggregations
    
    Args:
        db: Database session
        user_id: User ID to associate content with
    
    Returns:
        dict with counts of created items
    """
    try:
        logger.info(f"Seeding demo content for user {user_id}")
        
        # Create themes first
        themes_data = [
            {"name": "Tech Reviews", "description": "In-depth product reviews and unboxings", "color": "#3B82F6"},
            {"name": "Tutorials", "description": "How-to guides and educational content", "color": "#10B981"},
            {"name": "Behind the Scenes", "description": "Creator life and process videos", "color": "#F59E0B"},
            {"name": "Tips & Tricks", "description": "Quick tips and productivity hacks", "color": "#8B5CF6"},
        ]
        
        themes = []
        for theme_data in themes_data:
            theme = ContentTheme(
                id=uuid4(),
                user_id=user_id,
                name=theme_data["name"],
                description=theme_data["description"],
                color=theme_data["color"],
                content_count=0,
                total_views=0,
                avg_engagement_rate=0,
                avg_performance_score=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            themes.append(theme)
            db.add(theme)
        
        await db.flush()
        logger.info(f"Created {len(themes)} themes")
        
        # Create diverse content pieces
        content_templates = [
            # YouTube videos
            {"platform": "youtube", "type": "video", "title": "iPhone 16 Pro Max Review - Is It Worth the Upgrade?", "theme": "Tech Reviews", "views_range": (45000, 55000), "category": "overperforming"},
            {"platform": "youtube", "type": "video", "title": "How I Edit Videos 10x Faster - My Complete Workflow", "theme": "Tutorials", "views_range": (32000, 38000), "category": "overperforming"},
            {"platform": "youtube", "type": "video", "title": "5 Camera Settings You're Probably Getting Wrong", "theme": "Tips & Tricks", "views_range": (28000, 35000), "category": "normal"},
            {"platform": "youtube", "type": "video", "title": "A Day in My Life as a Content Creator", "theme": "Behind the Scenes", "views_range": (18000, 25000), "category": "normal"},
            {"platform": "youtube", "type": "video", "title": "Testing the NEW Sony A7S IV - Game Changer?", "theme": "Tech Reviews", "views_range": (12000, 18000), "category": "underperforming"},
            {"platform": "youtube", "type": "short", "title": "Quick Tip: Better Lighting with $20", "theme": "Tips & Tricks", "views_range": (85000, 120000), "category": "overperforming"},
            
            # Instagram posts
            {"platform": "instagram", "type": "reel", "title": "The TRUTH About Being a Full-Time Creator", "theme": "Behind the Scenes", "views_range": (95000, 150000), "category": "overperforming"},
            {"platform": "instagram", "type": "reel", "title": "3 Apps I Use EVERY DAY for Content", "theme": "Tips & Tricks", "views_range": (65000, 95000), "category": "overperforming"},
            {"platform": "instagram", "type": "post", "title": "New Setup Reveal - My Dream Studio", "theme": "Behind the Scenes", "views_range": (42000, 58000), "category": "normal"},
            {"platform": "instagram", "type": "reel", "title": "MacBook Pro vs Windows for Editing", "theme": "Tech Reviews", "views_range": (35000, 48000), "category": "normal"},
            {"platform": "instagram", "type": "post", "title": "Gear I'm Selling This Month", "theme": "Tech Reviews", "views_range": (15000, 22000), "category": "underperforming"},
            
            # TikTok videos
            {"platform": "tiktok", "type": "video", "title": "POV: You finally understand color grading", "theme": "Tutorials", "views_range": (250000, 380000), "category": "overperforming"},
            {"platform": "tiktok", "type": "video", "title": "Why I switched from iPhone to Android", "theme": "Tech Reviews", "views_range": (185000, 240000), "category": "overperforming"},
            {"platform": "tiktok", "type": "video", "title": "Editing hack that changed my life", "theme": "Tips & Tricks", "views_range": (125000, 175000), "category": "normal"},
            {"platform": "tiktok", "type": "video", "title": "My morning routine as a creator", "theme": "Behind the Scenes", "views_range": (75000, 115000), "category": "normal"},
            {"platform": "tiktok", "type": "video", "title": "Unpopular opinion about cameras", "theme": "Tech Reviews", "views_range": (45000, 65000), "category": "underperforming"},
        ]
        
        content_pieces = []
        performances = []
        insights_list = []
        
        for i, template in enumerate(content_templates):
            # Create content piece
            theme_obj = next((t for t in themes if t.name == template["theme"]), themes[0])
            published_date = datetime.utcnow() - timedelta(days=random.randint(1, 25))
            
            content = ContentPiece(
                id=uuid4(),
                user_id=user_id,
                platform=template["platform"],
                platform_id=f"demo_{template['platform']}_{i}_{int(datetime.utcnow().timestamp())}",
                content_type=template["type"],
                title=template["title"],
                description=f"Demo content: {template['title']}",
                url=f"https://{template['platform']}.com/demo/{i}",
                thumbnail_url=f"https://picsum.photos/seed/{i}/1280/720",
                published_at=published_date,
                timezone="UTC",
                day_of_week=published_date.weekday(),
                hour_of_day=random.randint(8, 20),
                follower_count_at_post=random.randint(80000, 120000),
                theme=theme_obj.name,
                summary=f"Demo content showcasing {template['theme'].lower()}",
                is_demo=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            content_pieces.append(content)
            db.add(content)
            
            # Create performance metrics
            views = random.randint(*template["views_range"])
            likes = int(views * random.uniform(0.03, 0.08))
            comments = int(views * random.uniform(0.005, 0.015))
            shares = int(views * random.uniform(0.002, 0.008))
            
            engagement_rate = ((likes + comments + shares) / views * 100) if views > 0 else 0
            
            # Calculate performance score (0-100)
            if template["category"] == "overperforming":
                performance_score = random.uniform(75, 95)
            elif template["category"] == "underperforming":
                performance_score = random.uniform(20, 45)
            else:
                performance_score = random.uniform(50, 74)
            
            performance = ContentPerformance(
                id=uuid4(),
                content_id=content.id,
                views=views,
                impressions=int(views * random.uniform(1.2, 2.5)),
                likes=likes,
                comments_count=comments,
                shares=shares,
                saves=int(views * random.uniform(0.01, 0.03)),
                engagement_rate=round(engagement_rate, 2),
                performance_score=round(performance_score, 2),
                percentile_rank=int(performance_score),
                performance_category=template["category"],
                views_last_24h=int(views * random.uniform(0.05, 0.15)),
                engagement_last_24h=int((likes + comments) * random.uniform(0.05, 0.15)),
                calculated_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            performances.append(performance)
            db.add(performance)
            
            # Create insights
            if template["category"] == "overperforming":
                insight_templates = [
                    {"type": "success_factor", "category": "timing", "title": "Optimal Posting Time", "desc": "Posted during peak audience activity hours", "impact": "high", "positive": True},
                    {"type": "success_factor", "category": "topic", "title": "Trending Topic", "desc": "Content aligned with current trending discussions", "impact": "high", "positive": True},
                    {"type": "pattern", "category": "format", "title": "Engaging Hook", "desc": "Strong opening captured viewer attention quickly", "impact": "medium", "positive": True},
                ]
            elif template["category"] == "underperforming":
                insight_templates = [
                    {"type": "failure_factor", "category": "timing", "title": "Suboptimal Timing", "desc": "Posted when audience engagement is typically low", "impact": "high", "positive": False},
                    {"type": "failure_factor", "category": "format", "title": "Low Retention", "desc": "Viewers dropped off early, suggest stronger hook", "impact": "medium", "positive": False},
                ]
            else:
                insight_templates = [
                    {"type": "pattern", "category": "engagement", "title": "Standard Performance", "desc": "Performing within expected range for this content type", "impact": "medium", "positive": True},
                ]
            
            for insight_tmpl in insight_templates:
                insight = ContentInsight(
                    id=uuid4(),
                    content_id=content.id,
                    insight_type=insight_tmpl["type"],
                    category=insight_tmpl["category"],
                    title=insight_tmpl["title"],
                    description=insight_tmpl["desc"],
                    impact_level=insight_tmpl["impact"],
                    is_positive=insight_tmpl["positive"],
                    confidence_score=random.uniform(0.7, 0.95),
                    is_actionable=True,
                    generated_at=datetime.utcnow(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                insights_list.append(insight)
                db.add(insight)
        
        # Update theme aggregations
        for theme in themes:
            theme_content = [c for c in content_pieces if c.theme == theme.name]
            theme_performances = [p for p in performances if any(c.id == p.content_id for c in theme_content)]
            
            if theme_performances:
                theme.content_count = len(theme_content)
                theme.total_views = sum(p.views for p in theme_performances)
                theme.avg_engagement_rate = round(sum(p.engagement_rate for p in theme_performances) / len(theme_performances), 2)
                theme.avg_performance_score = round(sum(p.performance_score for p in theme_performances) / len(theme_performances), 2)
                theme.last_calculated_at = datetime.utcnow()
        
        await db.commit()
        
        result = {
            "content_pieces": len(content_pieces),
            "performances": len(performances),
            "insights": len(insights_list),
            "themes": len(themes),
        }
        
        logger.info(f"✅ Demo content seeded successfully: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to seed demo content: {e}", exc_info=True)
        await db.rollback()
        raise
