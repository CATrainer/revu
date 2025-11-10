"""Opportunity generation service using AI + templates."""

import os
import json
from typing import List, Dict, Optional
from datetime import datetime
import uuid

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.models.monetization import OpportunityTemplate, GeneratedOpportunities
from app.core.config import settings


class OpportunityGenerator:
    """Generates custom monetization opportunities using AI + templates."""

    def __init__(self, db: AsyncSession):
        self.db = db
        api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
        if not api_key:
            raise ValueError("CLAUDE_API_KEY not configured")

        self.ai = AsyncAnthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"
        self.templates = None  # Load lazily

    async def generate_opportunities(
        self,
        user_id: str,
        profile: Dict,
        content_analysis: Dict
    ) -> List[Dict]:
        """
        Main generation function.

        Returns 3-5 custom opportunities with full implementation plans.
        """

        logger.info(f"Generating opportunities for user {user_id}")

        # Load templates
        if not self.templates:
            self.templates = await self._load_templates()

        # Match to templates
        template_matches = await self._match_templates(profile, content_analysis)

        logger.info(f"Matched {len(template_matches)} templates for user {user_id}")

        # Generate opportunities
        prompt = self._build_generation_prompt(
            profile,
            content_analysis,
            template_matches
        )

        opportunities = await self._call_ai_generation(prompt)

        # Validate quality
        validated = await self._validate_opportunities(opportunities, profile)

        logger.info(f"Generated {len(validated)} validated opportunities")

        # Generate implementation plans for each
        for opp in validated:
            opp["implementation_plan"] = await self._generate_plan(
                opp,
                profile,
                content_analysis
            )

        # Store generation
        await self._store_generation(user_id, validated, profile, content_analysis)

        return validated

    async def generate_with_feedback(
        self,
        profile: Dict,
        content_analysis: Dict,
        previous_opportunities: List[Dict],
        user_feedback: str
    ) -> List[Dict]:
        """Regenerate opportunities based on user feedback."""

        logger.info("Regenerating opportunities with user feedback")

        # Load templates
        if not self.templates:
            self.templates = await self._load_templates()

        template_matches = await self._match_templates(profile, content_analysis)

        # Build prompt with feedback context
        prompt = f"""You previously generated these monetization opportunities:

{json.dumps(previous_opportunities, indent=2)}

The user provided this feedback:
"{user_feedback}"

Now generate 3-5 NEW opportunities that address their feedback. Make sure to:
1. Incorporate their preferences/concerns
2. Adjust effort level, timeline, or pricing based on feedback
3. Include alternatives they haven't seen yet

{self._build_generation_prompt(profile, content_analysis, template_matches)}"""

        opportunities = await self._call_ai_generation(prompt)
        validated = await self._validate_opportunities(opportunities, profile)

        # Generate plans
        for opp in validated:
            opp["implementation_plan"] = await self._generate_plan(
                opp,
                profile,
                content_analysis
            )

        return validated

    def _build_generation_prompt(
        self,
        profile: Dict,
        content_analysis: Dict,
        template_matches: List[Dict]
    ) -> str:
        """Build the AI prompt for opportunity generation."""

        prompt = f"""You are a monetization strategist analyzing a creator to generate personalized monetization opportunities.

# CREATOR DATA

## Profile
- Platform: {profile.get('primary_platform', 'Unknown')}
- Followers: {profile.get('follower_count', 0):,}
- Engagement Rate: {profile.get('engagement_rate', 0)}%
- Niche: {profile.get('niche', 'Unknown')}
- Content Frequency: {profile.get('content_frequency', 0)} posts/week
- Time Available: {profile.get('time_available_hours_per_week', 10)} hours/week

## Content Performance Analysis
Top Topics (by engagement):
{self._format_topics(content_analysis.get('top_topics', []))}

Content Type Performance:
{json.dumps(content_analysis.get('content_type_performance', {}), indent=2)}

## Audience Signals
Question Patterns:
{self._format_questions(content_analysis.get('audience_questions', []))}

- Questions per week: {content_analysis.get('question_volume_per_week', 0)}
- Repeat engagers: {content_analysis.get('repeat_engagers_count', 0)}
- DM volume: {content_analysis.get('dm_volume_estimate', 'unknown')}

## Growth Trajectory
{json.dumps(content_analysis.get('growth_trajectory', {}), indent=2)}

## Key Strengths
{', '.join(content_analysis.get('key_strengths', []))}

# TEMPLATE LIBRARY (Building Blocks)

You have access to these proven templates:
{self._format_templates(template_matches)}

# YOUR TASK

Generate 3-5 custom monetization opportunities for this creator.

For each opportunity:

1. **MATCH & ADAPT**: Use templates as building blocks, but customize heavily to their specific situation
2. **COMBINE**: Mix multiple templates when it creates a stronger opportunity (e.g., community + course)
3. **PERSONALIZE**: Reference their specific data (topics, audience signals, constraints)
4. **VALIDATE**: Ensure it's realistic given their situation

# OUTPUT FORMAT

Return a JSON array of opportunities. Each opportunity must include:
```json
{{
  "id": "unique-id",
  "title": "Specific, personalized title using their data",
  "description": "2-3 sentences explaining what they'll build",
  "revenue_min": number (realistic monthly minimum in USD),
  "revenue_max": number (realistic monthly maximum in USD),
  "confidence_score": number 0-100 (how confident you are this will work),
  "effort_level": "low" | "medium" | "high",
  "timeline_weeks": number (realistic weeks to launch),
  "why_this_works": [
    "Reason 1 citing their specific data/metrics",
    "Reason 2 with their specific audience signals",
    "Reason 3 comparing to similar creators or market data"
  ],
  "key_advantages": [
    "Advantage 1 specific to their situation",
    "Advantage 2 leveraging their strengths"
  ],
  "template_basis": ["template-id-1", "template-id-2"],
  "custom_elements": [
    "What makes this unique to them beyond the template"
  ]
}}
```

# CRITICAL RULES

1. **Never generic**: Bad: "Premium Community". Good: "Weekly Coding Q&A Community for Web Dev Beginners"

2. **Use their numbers**: Bad: "Many people ask questions". Good: "Your {content_analysis.get('question_volume_per_week', 0)} weekly comments asking 'how do I...' show clear demand"

3. **Be realistic**:
   - Don't promise $50K/mo to a 10K follower account
   - Consider their time constraints ({profile.get('time_available_hours_per_week', 10)} hours/week)
   - Account for their experience level

4. **Show reasoning**: Confidence score must be justified by data quality and template match strength

5. **Validate feasibility**:
   - Can they actually execute this?
   - Do they have the skills/time/budget?
   - Is there real market demand?

6. **Rank by confidence**: Put highest confidence opportunity first

Generate opportunities now:"""

        return prompt

    async def _call_ai_generation(self, prompt: str) -> List[Dict]:
        """Call Claude API to generate opportunities."""

        try:
            response = await self.ai.messages.create(
                model=self.model,
                max_tokens=4000,
                temperature=0.7,
                system="You are a monetization strategy expert. Return only valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse JSON response
            content = response.content[0].text

            # Extract JSON (might be wrapped in markdown code blocks)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            opportunities = json.loads(content.strip())

            # Ensure it's a list
            if isinstance(opportunities, dict):
                opportunities = [opportunities]

            return opportunities

        except Exception as e:
            logger.error(f"Error calling AI for opportunity generation: {e}")
            raise

    async def _generate_plan(
        self,
        opportunity: Dict,
        profile: Dict,
        content_analysis: Dict
    ) -> Dict:
        """Generate detailed implementation plan for an opportunity."""

        # Find relevant template plans
        template_plans = await self._get_template_plans(opportunity.get('template_basis', []))

        prompt = f"""You are generating a detailed, personalized implementation plan.

# OPPORTUNITY SELECTED
{json.dumps(opportunity, indent=2)}

# CREATOR CONTEXT
Platform: {profile.get('primary_platform')}
Followers: {profile.get('follower_count', 0):,}
Time Available: {profile.get('time_available_hours_per_week', 10)} hours/week
Niche: {profile.get('niche')}

Top Topics: {', '.join([t['topic'] for t in content_analysis.get('top_topics', [])[:3]])}
Key Strengths: {', '.join(content_analysis.get('key_strengths', []))}

# TEMPLATE PLANS (for reference)
{json.dumps(template_plans, indent=2)}

# YOUR TASK

Generate a complete implementation plan with 3-5 phases.

Each phase must have:
- Phase name (specific to their opportunity)
- Timeline (realistic given their {profile.get('time_available_hours_per_week', 10)} hours/week)
- 4-8 tasks specific to their situation

Each task must include:
```json
{{
  "id": "phase.task format (e.g., 1.2)",
  "task": "Specific action using their data",
  "time_estimate": "X hours",
  "cost_estimate": number (USD),
  "details": "Step-by-step how-to for THEIR specific situation",
  "why_this_matters": "Connects to their goals and situation",
  "success_criteria": "How to know it's done right",
  "common_pitfalls": "Specific to their niche/situation",
  "pro_tips": "Insider knowledge for their niche",
  "resources": ["specific tools/links they'll need"],
  "decision_type": "pricing" | "platform" | "content" | "structure" | "timeline" | null
}}
```

# CUSTOMIZATION RULES

1. **Repurpose their content**: Use their actual top topics in examples
2. **Leverage their strengths**: Reference their specific strengths in why_this_matters
3. **Address their constraints**: Account for their available time in timeline
4. **Use their audience**: Reference their specific audience signals
5. **Learn from similar**: Compare to creators in their niche at their follower level

# QUALITY BARS

- Every task actionable (no "research" or "think about")
- Time estimates realistic (account for learning curve)
- Costs accurate (current market rates)
- Details specific (use their actual data)
- Pro tips valuable (insider knowledge, not obvious advice)

# OUTPUT FORMAT

Return JSON:
```json
{{
  "phases": [
    {{
      "phase": "Phase name",
      "timeline": "Week X-Y",
      "steps": [/* array of tasks */]
    }}
  ]
}}
```

Generate the plan now:"""

        try:
            response = await self.ai.messages.create(
                model=self.model,
                max_tokens=6000,
                temperature=0.7,
                system="You are an implementation planning expert. Return only valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse JSON
            content = response.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            plan = json.loads(content.strip())

            return plan

        except Exception as e:
            logger.error(f"Error generating plan: {e}")
            # Return fallback simple plan
            return {
                "phases": [
                    {
                        "phase": "Planning",
                        "timeline": "Week 1",
                        "steps": [
                            {
                                "id": "1.1",
                                "task": "Define your strategy",
                                "time_estimate": "2 hours",
                                "cost_estimate": 0,
                                "details": "Plan your approach based on your audience and goals.",
                                "decision_type": "structure"
                            }
                        ]
                    }
                ]
            }

    async def _validate_opportunities(
        self,
        opportunities: List[Dict],
        profile: Dict
    ) -> List[Dict]:
        """Validate opportunities for quality and realism."""

        validated = []
        follower_count = profile.get('follower_count', 0)

        for opp in opportunities:
            # Check confidence score is reasonable
            if opp.get('confidence_score', 0) < 50:
                continue  # Too low confidence

            # Validate revenue is realistic
            if not self._validate_revenue(opp, follower_count):
                opp = self._adjust_revenue(opp, follower_count)

            # Check timeline is reasonable
            if opp.get('timeline_weeks', 0) > 26:  # More than 6 months is too long
                opp['timeline_weeks'] = 12  # Adjust to 3 months

            # Ensure required fields exist
            if not all(k in opp for k in ['id', 'title', 'description']):
                continue

            # Generate unique ID if missing
            if not opp.get('id'):
                opp['id'] = f"opp-{uuid.uuid4().hex[:8]}"

            validated.append(opp)

        # Sort by confidence score
        validated.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)

        return validated[:5]  # Max 5 opportunities

    def _validate_revenue(self, opp: Dict, follower_count: int) -> bool:
        """Check if revenue estimates are realistic."""

        revenue_max = opp.get('revenue_max', 0)

        # Heuristic: max monthly revenue shouldn't exceed follower_count * $2
        max_realistic = follower_count * 2

        return revenue_max <= max_realistic

    def _adjust_revenue(self, opp: Dict, follower_count: int) -> Dict:
        """Adjust revenue to be more realistic."""

        max_realistic = follower_count * 2

        if opp.get('revenue_max', 0) > max_realistic:
            # Scale down proportionally
            scale_factor = max_realistic / opp['revenue_max']
            opp['revenue_max'] = int(max_realistic)
            opp['revenue_min'] = int(opp.get('revenue_min', 0) * scale_factor)

        return opp

    async def _match_templates(
        self,
        profile: Dict,
        content_analysis: Dict
    ) -> List[Dict]:
        """Match creator to relevant templates. Returns sorted list by match score."""

        templates = await self._load_templates()
        matches = []

        follower_count = profile.get('follower_count', 0)
        engagement_rate = profile.get('engagement_rate', 0)
        content_types = [profile.get('primary_platform', '').lower()]

        for template in templates:
            score = 0
            ideal_for = template.get('ideal_for', {})

            # Check follower requirement
            min_followers = ideal_for.get('min_followers', 0)
            if follower_count >= min_followers:
                score += 10
                # Bonus for being in sweet spot (within 3x of minimum)
                if follower_count <= min_followers * 3:
                    score += 5
            else:
                continue  # Skip if below minimum

            # Check engagement rate
            min_engagement = ideal_for.get('engagement_rate_min', 0)
            if engagement_rate >= min_engagement:
                score += 10

            # Check content type match
            template_content_types = ideal_for.get('content_types', [])
            if 'any' in template_content_types or any(
                ct in str(content_types) for ct in template_content_types
            ):
                score += 5

            # Check audience signals
            template_signals = set(ideal_for.get('audience_signals', []))
            creator_strengths = set(content_analysis.get('key_strengths', []))

            signal_overlap = len(template_signals & creator_strengths)
            score += signal_overlap * 5

            if score > 0:
                matches.append({
                    **template,
                    'match_score': score
                })

        # Sort by match score
        matches.sort(key=lambda x: x['match_score'], reverse=True)

        return matches[:10]  # Top 10 matches

    async def _load_templates(self) -> List[Dict]:
        """Load all opportunity templates from DB."""

        result = await self.db.execute(select(OpportunityTemplate))
        templates = result.scalars().all()

        return [
            {
                "id": t.id,
                "category": t.category,
                "title": t.title,
                "description": t.description,
                "ideal_for": t.ideal_for,
                "revenue_model": t.revenue_model,
                "implementation_template": t.implementation_template,
                "success_patterns": t.success_patterns
            }
            for t in templates
        ]

    async def _get_template_plans(self, template_ids: List[str]) -> List[Dict]:
        """Get implementation plans from templates."""

        if not template_ids:
            return []

        result = await self.db.execute(
            select(OpportunityTemplate).where(OpportunityTemplate.id.in_(template_ids))
        )
        templates = result.scalars().all()

        return [
            {
                "template_id": t.id,
                "title": t.title,
                "implementation_template": t.implementation_template
            }
            for t in templates
        ]

    async def _store_generation(
        self,
        user_id: str,
        opportunities: List[Dict],
        profile: Dict,
        content_analysis: Dict
    ):
        """
        Store generated opportunities in DB.

        Uses a fresh database session to avoid connection timeout issues
        after long-running AI operations.
        """
        from app.core.database import get_async_session_context

        generation = GeneratedOpportunities(
            user_id=user_id,
            generation_context={
                "profile_data": profile,
                "content_analysis_summary": {
                    "top_topics_count": len(content_analysis.get('top_topics', [])),
                    "strengths": content_analysis.get('key_strengths', [])
                },
                "templates_used": [opp.get('template_basis', []) for opp in opportunities],
                "generated_at": datetime.utcnow().isoformat()
            },
            opportunities=opportunities,
            generated_at=datetime.utcnow()
        )

        # Use a fresh database session to avoid connection timeout
        async with get_async_session_context() as fresh_db:
            fresh_db.add(generation)
            await fresh_db.commit()
            await fresh_db.refresh(generation)

        logger.info(f"Stored generation {generation.id} for user {user_id}")

    def _format_topics(self, topics: List[Dict]) -> str:
        """Format topics for prompt."""
        if not topics:
            return "No topic data available"

        lines = []
        for topic in topics[:5]:  # Top 5
            lines.append(
                f"- {topic['topic']}: {topic['engagement_score']}/10 engagement "
                f"({topic['post_count']} posts, {topic['avg_views']:,} avg views)"
            )

        return "\n".join(lines)

    def _format_questions(self, questions: List[Dict]) -> str:
        """Format questions for prompt."""
        if not questions:
            return "No question data available"

        lines = []
        for q in questions:
            examples_str = ", ".join(f'"{ex}"' for ex in q['examples'][:2])
            lines.append(f"- {q['type']}: {q['frequency']} occurrences (e.g., {examples_str})")

        return "\n".join(lines)

    def _format_templates(self, templates: List[Dict]) -> str:
        """Format templates for prompt."""
        if not templates:
            return "No matching templates"

        lines = []
        for t in templates[:8]:  # Top 8 matches
            lines.append(f"""
**{t['title']}** (ID: {t['id']})
Category: {t['category']}
Match Score: {t.get('match_score', 0)}
Revenue: ${t['revenue_model'].get('pricing_range', [0, 0])[0]}-${t['revenue_model'].get('pricing_range', [0, 0])[1]}/mo
Description: {t['description']}
""")

        return "\n".join(lines)
