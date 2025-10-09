"""Content context service for AI chat integration."""
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.content import ContentPiece, ContentPerformance, ContentInsight


async def get_content_context(
    session: AsyncSession,
    user_id: UUID,
    content_id: Optional[UUID] = None,
) -> str:
    """
    Get content performance context for AI chat.
    
    If content_id is provided, returns detailed context about that specific content.
    Otherwise, returns general performance summary.
    """
    
    if content_id:
        return await _get_specific_content_context(session, user_id, content_id)
    else:
        return await _get_general_performance_context(session, user_id)


async def _get_specific_content_context(
    session: AsyncSession,
    user_id: UUID,
    content_id: UUID,
) -> str:
    """Get detailed context about a specific content piece."""
    
    # Get content piece
    stmt = select(ContentPiece).where(
        ContentPiece.id == content_id,
        ContentPiece.user_id == user_id,
    )
    result = await session.execute(stmt)
    content = result.scalar_one_or_none()
    
    if not content:
        return ""
    
    # Get performance
    perf_stmt = select(ContentPerformance).where(ContentPerformance.content_id == content.id)
    perf_result = await session.execute(perf_stmt)
    performance = perf_result.scalar_one_or_none()
    
    # Get insights
    insights_stmt = (
        select(ContentInsight)
        .where(ContentInsight.content_id == content.id)
        .order_by(desc(ContentInsight.impact_level))
    )
    insights_result = await session.execute(insights_stmt)
    insights = insights_result.scalars().all()
    
    # Build context string
    context = f"\n\n📹 CONTENT CONTEXT - Analyzing: \"{content.title}\"\n"
    context += f"Platform: {content.platform.title()} | Type: {content.content_type}\n"
    context += f"Theme: {content.theme or 'General'} | Published: {content.published_at.strftime('%Y-%m-%d %H:%M')}\n"
    
    if performance:
        context += f"\n📊 Performance Metrics:\n"
        context += f"- Views: {performance.views:,} | Engagement Rate: {performance.engagement_rate:.1f}%\n"
        context += f"- Likes: {performance.likes:,} | Comments: {performance.comments_count:,} | Shares: {performance.shares:,}\n"
        context += f"- Performance Score: {performance.performance_score:.0f}/100 ({performance.performance_category})\n"
        context += f"- Percentile Rank: Top {100-performance.percentile_rank}% of your content\n"
        
        if performance.retention_rate:
            context += f"- Retention Rate: {performance.retention_rate:.1f}%\n"
        if performance.followers_gained:
            context += f"- Followers Gained: {performance.followers_gained:,}\n"
    
    if insights:
        context += f"\n💡 Key Insights ({len(insights)} factors identified):\n"
        for insight in insights[:5]:  # Top 5 insights
            impact_emoji = "🔴" if insight.impact_level == "high" else "🟡" if insight.impact_level == "medium" else "🟢"
            status_emoji = "✅" if insight.is_positive else "⚠️"
            context += f"{status_emoji} {impact_emoji} {insight.title}: {insight.description}\n"
    
    context += f"\n📝 YOUR ROLE: You are Repruv AI, helping the creator understand and replicate (or avoid) this content's performance. "
    context += f"Provide specific, actionable advice based on the data above. If they ask about 'this content' or 'it', you're referring to '{content.title}'.\n"
    
    return context


async def _get_general_performance_context(
    session: AsyncSession,
    user_id: UUID,
) -> str:
    """Get general performance summary across all content."""
    
    # Get total content count
    count_stmt = select(ContentPiece).where(
        ContentPiece.user_id == user_id,
        ContentPiece.is_deleted == False,
    )
    count_result = await session.execute(count_stmt)
    content_pieces = count_result.scalars().all()
    
    if not content_pieces:
        return ""
    
    total_content = len(content_pieces)
    
    # Calculate overall performance
    total_views = 0
    total_engagement = 0
    platforms = {}
    top_performers = []
    
    for content in content_pieces:
        # Get performance for each piece
        perf_stmt = select(ContentPerformance).where(ContentPerformance.content_id == content.id)
        perf_result = await session.execute(perf_stmt)
        performance = perf_result.scalar_one_or_none()
        
        if performance:
            total_views += performance.views or 0
            total_engagement += performance.engagement_rate or 0
            
            # Track by platform
            if content.platform not in platforms:
                platforms[content.platform] = {'count': 0, 'views': 0, 'engagement': 0}
            platforms[content.platform]['count'] += 1
            platforms[content.platform]['views'] += performance.views or 0
            platforms[content.platform]['engagement'] += performance.engagement_rate or 0
            
            # Track top performers
            if performance.performance_category == 'overperforming':
                top_performers.append({
                    'title': content.title,
                    'theme': content.theme,
                    'score': performance.performance_score,
                })
    
    avg_engagement = total_engagement / total_content if total_content > 0 else 0
    
    # Build context
    context = f"\n\n📊 USER'S OVERALL CONTENT PERFORMANCE:\n"
    context += f"Total Content Pieces: {total_content}\n"
    context += f"Total Views: {total_views:,}\n"
    context += f"Average Engagement Rate: {avg_engagement:.1f}%\n"
    
    # Platform breakdown
    if platforms:
        context += f"\n📱 Platform Breakdown:\n"
        for platform, data in platforms.items():
            avg_platform_engagement = data['engagement'] / data['count'] if data['count'] > 0 else 0
            context += f"- {platform.title()}: {data['count']} pieces, {data['views']:,} views, {avg_platform_engagement:.1f}% avg engagement\n"
    
    # Top performers
    if top_performers:
        top_performers.sort(key=lambda x: x['score'], reverse=True)
        context += f"\n⭐ Top Performing Content ({len(top_performers)} overperforming):\n"
        for content in top_performers[:3]:
            context += f"- \"{content['title'][:50]}...\" ({content['theme']}) - Score: {content['score']:.0f}/100\n"
    
    context += f"\n📝 YOUR ROLE: Use this performance data to provide personalized recommendations. "
    context += f"Help the creator understand what works and create action plans for improvement.\n"
    
    return context


async def build_chat_system_prompt(
    session: AsyncSession,
    user_id: UUID,
    content_id: Optional[UUID] = None,
) -> str:
    """Build a complete system prompt with content context."""
    
    base_prompt = """You are Repruv AI, an expert content strategist and growth advisor for content creators.

Your expertise includes:
- Analyzing content performance across YouTube, Instagram, and TikTok
- Identifying patterns in what content resonates with audiences
- Creating specific, actionable strategies to improve engagement
- Understanding platform algorithms and best practices
- Helping creators develop sustainable content systems

When providing advice:
1. Be specific and data-driven when performance data is available
2. Offer concrete next steps, not just general advice
3. Acknowledge uncertainties honestly
4. Focus on sustainable growth, not tricks or hacks
5. When appropriate, offer to create action plans the creator can track

Your tone is friendly, knowledgeable, and encouraging while being honest about challenges."""
    
    # Add content context
    content_context = await get_content_context(session, user_id, content_id)
    
    if content_context:
        return base_prompt + content_context
    else:
        return base_prompt


async def create_action_plan_from_conversation(
    session: AsyncSession,
    user_id: UUID,
    chat_session_id: UUID,
    plan_details: Dict[str, Any],
) -> UUID:
    """Create an action plan from an AI chat conversation."""
    from app.models.content import ActionPlan, ActionItem
    from datetime import datetime
    
    # Create the plan
    plan = ActionPlan(
        user_id=user_id,
        name=plan_details.get('name', 'AI-Generated Plan'),
        description=plan_details.get('description'),
        goal=plan_details.get('goal', ''),
        source_type='ai_chat',
        source_chat_session_id=chat_session_id,
        source_content_id=plan_details.get('content_id'),
        start_date=datetime.utcnow(),
        end_date=plan_details.get('end_date'),
        estimated_duration_days=plan_details.get('duration_days'),
        projected_outcomes=plan_details.get('projected_outcomes'),
        status='active',
    )
    session.add(plan)
    await session.flush()
    
    # Create action items
    for idx, item_data in enumerate(plan_details.get('action_items', [])):
        item = ActionItem(
            plan_id=plan.id,
            title=item_data['title'],
            description=item_data.get('description'),
            order_index=idx,
            due_date=item_data.get('due_date'),
            estimated_hours=item_data.get('estimated_hours'),
            projected_outcome=item_data.get('projected_outcome'),
        )
        session.add(item)
    
    await session.commit()
    return plan.id
