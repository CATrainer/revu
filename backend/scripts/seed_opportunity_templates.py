#!/usr/bin/env python3
"""
Seed opportunity templates into the database from JSON file.

Usage:
    python scripts/seed_opportunity_templates.py
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from loguru import logger

from app.core.database import async_session_maker
from app.models.monetization import OpportunityTemplate


async def load_templates_from_json(filepath: str):
    """Load templates from JSON file."""

    with open(filepath, 'r') as f:
        templates = json.load(f)

    logger.info(f"Loaded {len(templates)} templates from {filepath}")
    return templates


async def seed_templates():
    """Seed all templates into database."""

    # Get templates file path
    script_dir = Path(__file__).parent.parent
    templates_file = script_dir / "data" / "opportunity_templates.json"

    if not templates_file.exists():
        logger.error(f"Templates file not found: {templates_file}")
        return False

    # Load templates
    templates = await load_templates_from_json(str(templates_file))

    # Connect to database
    async with async_session_maker() as db:
        try:
            # Check existing templates
            result = await db.execute(select(OpportunityTemplate))
            existing = {t.id: t for t in result.scalars().all()}

            logger.info(f"Found {len(existing)} existing templates in database")

            # Upsert templates
            added = 0
            updated = 0

            for template_data in templates:
                template_id = template_data['id']

                if template_id in existing:
                    # Update existing
                    template = existing[template_id]
                    template.category = template_data['category']
                    template.title = template_data['title']
                    template.description = template_data['description']
                    template.ideal_for = template_data['ideal_for']
                    template.revenue_model = template_data['revenue_model']
                    template.implementation_template = template_data['implementation_template']
                    template.success_patterns = template_data.get('success_patterns')

                    updated += 1
                    logger.info(f"Updated template: {template_id}")
                else:
                    # Create new
                    template = OpportunityTemplate(
                        id=template_id,
                        category=template_data['category'],
                        title=template_data['title'],
                        description=template_data['description'],
                        ideal_for=template_data['ideal_for'],
                        revenue_model=template_data['revenue_model'],
                        implementation_template=template_data['implementation_template'],
                        success_patterns=template_data.get('success_patterns')
                    )

                    db.add(template)
                    added += 1
                    logger.info(f"Added template: {template_id}")

            # Commit changes
            await db.commit()

            logger.success(f"✅ Seeding complete: {added} added, {updated} updated")
            return True

        except Exception as e:
            logger.error(f"Error seeding templates: {e}")
            await db.rollback()
            return False


async def main():
    """Main entry point."""

    logger.info("Starting opportunity templates seeding...")

    success = await seed_templates()

    if success:
        logger.success("✅ Templates seeded successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Failed to seed templates")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
