"""Seed database with demo data."""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.core.security import get_password_hash
from app.models.organization import Organization
from app.models.location import Location
from app.models.user import User, UserMembership
from app.models.review import Review


async def seed_demo_data():
    """Seed the database with demo data for development."""
    async with async_session_maker() as db:
        try:
            logger.info("Starting database seeding...")
            
            # Create demo organization
            org = Organization(
                name="Demo Restaurant Group",
                type="business",
                subscription_tier="professional",
                trial_ends_at=datetime.utcnow() + timedelta(days=30),
                settings={
                    "features": {
                        "ai_responses": True,
                        "competitor_tracking": True,
                        "social_monitoring": True
                    }
                }
            )
            db.add(org)
            await db.flush()
            
            # Create demo user
            user = User(
                email="demo@revu.ai",
                full_name="Demo User",
                hashed_password=get_password_hash("demo123"),
                is_active=True
            )
            db.add(user)
            await db.flush()
            
            # Create user membership
            membership = UserMembership(
                user_id=user.id,
                organization_id=org.id,
                role="owner"
            )
            db.add(membership)
            
            # Create demo locations
            locations = [
                Location(
                    organization_id=org.id,
                    name="Main Street Restaurant",
                    address="123 Main St, London, UK",
                    google_place_id="ChIJ_WegsaCYc0YRlL-VZr2M",
                    timezone="Europe/London",
                    brand_voice_data={
                        "tone": "friendly",
                        "style": "professional",
                        "personality_traits": ["welcoming", "attentive", "knowledgeable"],
                        "do_list": ["Thank customers", "Address concerns", "Invite them back"],
                        "dont_list": ["Make excuses", "Blame staff", "Use generic responses"]
                    },
                    business_info={
                        "business_type": "Italian Restaurant",
                        "specialties": ["Pasta", "Pizza", "Wine"],
                        "unique_features": ["Wood-fired oven", "Homemade pasta", "Family recipes"],
                        "target_audience": "Families and couples",
                        "hours": {
                            "monday": "12:00-22:00",
                            "tuesday": "12:00-22:00",
                            "wednesday": "12:00-22:00",
                            "thursday": "12:00-23:00",
                            "friday": "12:00-23:00",
                            "saturday": "11:00-23:00",
                            "sunday": "11:00-21:00"
                        }
                    }
                ),
                Location(
                    organization_id=org.id,
                    name="High Street Bistro",
                    address="456 High St, Manchester, UK",
                    google_place_id="ChIJ_WegsaCYc0YRlL-VZr2N",
                    timezone="Europe/London",
                    is_active=True
                )
            ]
            
            for location in locations:
                db.add(location)
            await db.flush()
            
            # Create sample reviews for the first location
            sample_reviews = [
                {
                    "author_name": "Sarah Johnson",
                    "rating": 5,
                    "review_text": "Amazing experience! The new menu items are fantastic, especially the truffle pasta. Our waiter James was incredibly attentive and knowledgeable. Will definitely be back soon!",
                    "sentiment": "positive",
                    "sentiment_score": 0.95,
                    "published_at": datetime.utcnow() - timedelta(hours=5)
                },
                {
                    "author_name": "Michael Chen",
                    "rating": 2,
                    "review_text": "Disappointed with my recent visit. The food took over an hour to arrive and was cold when it did. The server seemed overwhelmed and forgot our drinks order twice. This used to be our favorite place but the quality has really gone downhill.",
                    "sentiment": "negative",
                    "sentiment_score": 0.15,
                    "published_at": datetime.utcnow() - timedelta(hours=2),
                    "tags": ["service", "wait_time", "food_quality"]
                },
                {
                    "author_name": "Emma Wilson",
                    "rating": 4,
                    "review_text": "Good food and nice atmosphere. The pizza was delicious but the service was a bit slow. Overall enjoyed our meal and would come back.",
                    "sentiment": "positive",
                    "sentiment_score": 0.75,
                    "published_at": datetime.utcnow() - timedelta(days=1)
                },
                {
                    "author_name": "David Brown",
                    "rating": 5,
                    "review_text": "Best Italian restaurant in town! The homemade pasta is to die for. Great wine selection too. Highly recommend!",
                    "sentiment": "positive",
                    "sentiment_score": 0.98,
                    "published_at": datetime.utcnow() - timedelta(days=2)
                },
                {
                    "author_name": "Lisa Anderson",
                    "rating": 3,
                    "review_text": "Food was okay but nothing special. Prices have gone up quite a bit. The tiramisu was the highlight of the meal.",
                    "sentiment": "neutral",
                    "sentiment_score": 0.5,
                    "published_at": datetime.utcnow() - timedelta(days=3)
                }
            ]
            
            for review_data in sample_reviews:
                review = Review(
                    location_id=locations[0].id,
                    platform="google",
                    platform_review_id=f"google_{uuid4().hex[:12]}",
                    **review_data
                )
                db.add(review)
            
            await db.commit()
            logger.info("Database seeding completed successfully!")
            
            # Print access credentials
            print("\n" + "="*50)
            print("Demo Account Created:")
            print(f"Email: demo@revu.ai")
            print(f"Password: demo123")
            print(f"Organization: {org.name}")
            print(f"Locations: {len(locations)}")
            print(f"Sample Reviews: {len(sample_reviews)}")
            print("="*50 + "\n")
            
        except Exception as e:
            logger.error(f"Error seeding database: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_demo_data())