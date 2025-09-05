"""add analytics & helper sql functions

Revision ID: 20250905_1210
Revises: 20250905_1200
Create Date: 2025-09-05

"""
from __future__ import annotations

from alembic import op  # noqa: F401

# revision identifiers, used by Alembic.
revision = "20250905_1210"
down_revision = "20250905_1200"
branch_labels = None
depends_on = None


FUNCTIONS_SQL = [
    # 1. search_similar_content
    r"""
    CREATE OR REPLACE FUNCTION search_similar_content(
        p_user_id uuid,
        p_query_embedding vector(1536),
        p_limit int DEFAULT 20,
        p_doc_types text[] DEFAULT NULL,
        p_platforms text[] DEFAULT NULL,
        p_min_similarity double precision DEFAULT 0.30
    ) RETURNS TABLE(
        id uuid,
        source_table text,
        source_id uuid,
        doc_type text,
        platform text,
        content text,
        similarity double precision,
        metadata jsonb
    ) LANGUAGE sql STABLE PARALLEL SAFE AS $$
        /* Vector similarity search against content_embeddings.
           similarity = 1 - cosine_distance (pgvector <=> operator returns cosine distance when index uses vector_cosine_ops). */
        SELECT
            ce.id,
            ce.source_table,
            ce.source_id,
            ce.doc_type,
            ce.platform,
            ce.content,
            (1 - (ce.embedding <=> p_query_embedding)) AS similarity,
            ce.metadata
        FROM content_embeddings ce
        WHERE ce.user_id = p_user_id
          AND ce.embedding IS NOT NULL
          AND (p_doc_types IS NULL OR ce.doc_type = ANY(p_doc_types))
          AND (p_platforms IS NULL OR ce.platform = ANY(p_platforms))
          AND (1 - (ce.embedding <=> p_query_embedding)) >= p_min_similarity
        ORDER BY ce.embedding <=> p_query_embedding ASC
        LIMIT p_limit
    $$;
    """,
    # 2. calculate_influence_score
    r"""
    CREATE OR REPLACE FUNCTION calculate_influence_score(
        p_followers int,
        p_avg_engagement_rate numeric,
        p_is_verified boolean DEFAULT false,
        p_platform text DEFAULT NULL
    ) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE
        v_followers_component numeric := LEAST((LOG(GREATEST(p_followers,1)) / LOG(10)) * 20, 40); -- cap at 40
        v_engagement_component numeric := COALESCE(p_avg_engagement_rate,0) * 300; -- 5% => 15 points
        v_verified_bonus numeric := CASE WHEN p_is_verified THEN 10 ELSE 0 END; -- up to 10
        v_platform_weight numeric := CASE p_platform
            WHEN 'youtube' THEN 1.00
            WHEN 'tiktok' THEN 0.95
            WHEN 'instagram' THEN 0.90
            WHEN 'twitter' THEN 0.85
            WHEN 'linkedin' THEN 0.80
            ELSE 0.75 END; -- default
        v_score numeric;
    BEGIN
        v_score := (v_followers_component + v_engagement_component + v_verified_bonus) * v_platform_weight;
        RETURN ROUND(LEAST(v_score, 100)::numeric, 2);
    END;$$;
    """,
    # 3. get_sentiment_timeline
    r"""
    CREATE OR REPLACE FUNCTION get_sentiment_timeline(
        p_user_id uuid,
        p_start timestamptz,
        p_end timestamptz,
        p_interval text DEFAULT '1 day',
        p_platforms text[] DEFAULT NULL
    ) RETURNS TABLE(
        bucket_start timestamptz,
        bucket_end timestamptz,
        mention_count int,
        avg_sentiment numeric,
        positive_count int,
        negative_count int,
        neutral_count int
    ) LANGUAGE sql STABLE AS $$
        WITH buckets AS (
            SELECT generate_series(
                date_trunc('second', p_start),
                p_end,
                p_interval::interval
            ) AS bucket_start
        )
        SELECT
            b.bucket_start,
            b.bucket_start + p_interval::interval AS bucket_end,
            COUNT(m.id) AS mention_count,
            AVG(m.sentiment) AS avg_sentiment,
            COUNT(m.id) FILTER (WHERE m.sentiment > 0.15) AS positive_count,
            COUNT(m.id) FILTER (WHERE m.sentiment < -0.15) AS negative_count,
            COUNT(m.id) FILTER (WHERE m.sentiment IS NOT NULL AND m.sentiment BETWEEN -0.15 AND 0.15) AS neutral_count
        FROM buckets b
        LEFT JOIN social_mentions m
          ON m.user_id = p_user_id
         AND m.published_at >= b.bucket_start
         AND m.published_at <  b.bucket_start + p_interval::interval
         AND (p_platforms IS NULL OR m.platform = ANY(p_platforms))
        GROUP BY 1,2
        ORDER BY 1
    $$;
    """,
    # 4. update_narrative_thread
    r"""
    CREATE OR REPLACE FUNCTION update_narrative_thread(
        p_thread_id uuid
    ) RETURNS void LANGUAGE plpgsql AS $$
    DECLARE
        v_data RECORD;
    BEGIN
        -- Aggregate metrics from social_mentions referencing this thread
        SELECT
            COUNT(*) AS cnt,
            MIN(published_at) AS first_seen,
            MAX(published_at) AS last_seen,
            AVG(sentiment) AS avg_sentiment
        INTO v_data
        FROM social_mentions
        WHERE thread_id = p_thread_id;

        UPDATE narrative_threads nt
        SET mention_count = COALESCE(v_data.cnt,0),
            first_seen_at = v_data.first_seen,
            last_seen_at = v_data.last_seen,
            sentiment = v_data.avg_sentiment
        WHERE nt.id = p_thread_id;
    END;$$;
    """,
    # 5. get_dashboard_metrics
    r"""
    CREATE OR REPLACE FUNCTION get_dashboard_metrics(
        p_user_id uuid,
        p_period_start timestamptz,
        p_period_end timestamptz
    ) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
    DECLARE
        v_total_mentions int;
        v_prev_mentions int;
        v_new_threads int;
        v_active_threads int;
        v_avg_sentiment numeric;
        v_top_platforms jsonb;
        v_top_threads jsonb;
        v_growth numeric;
        v_prev_start timestamptz := p_period_start - (p_period_end - p_period_start);
        v_prev_end   timestamptz := p_period_start;
    BEGIN
        SELECT COUNT(*) INTO v_total_mentions
        FROM social_mentions
        WHERE user_id = p_user_id
          AND collected_at >= p_period_start
          AND collected_at <  p_period_end;

        SELECT COUNT(*) INTO v_prev_mentions
        FROM social_mentions
        WHERE user_id = p_user_id
          AND collected_at >= v_prev_start
          AND collected_at <  v_prev_end;

        IF v_prev_mentions IS NULL OR v_prev_mentions = 0 THEN
            v_growth := NULL;  -- avoid division by zero
        ELSE
            v_growth := ROUND(((v_total_mentions - v_prev_mentions)::numeric / v_prev_mentions) * 100, 2);
        END IF;

        SELECT COUNT(*) INTO v_new_threads
        FROM narrative_threads
        WHERE user_id = p_user_id
          AND first_seen_at >= p_period_start
          AND first_seen_at <  p_period_end;

        SELECT COUNT(*) INTO v_active_threads
        FROM narrative_threads
        WHERE user_id = p_user_id
          AND last_seen_at >= p_period_start
          AND last_seen_at <  p_period_end;

        SELECT AVG(sentiment) INTO v_avg_sentiment
        FROM social_mentions
        WHERE user_id = p_user_id
          AND collected_at >= p_period_start
          AND collected_at <  p_period_end
          AND sentiment IS NOT NULL;

        SELECT COALESCE(jsonb_agg(pl ORDER BY pl.ct DESC), '[]'::jsonb) INTO v_top_platforms
        FROM (
            SELECT platform, COUNT(*) AS ct
            FROM social_mentions
            WHERE user_id = p_user_id
              AND collected_at >= p_period_start
              AND collected_at <  p_period_end
            GROUP BY platform
            ORDER BY COUNT(*) DESC
            LIMIT 5
        ) pl;

        SELECT COALESCE(jsonb_agg(tt ORDER BY tt.mention_count DESC), '[]'::jsonb) INTO v_top_threads
        FROM (
            SELECT id, title, mention_count, sentiment, last_seen_at
            FROM narrative_threads
            WHERE user_id = p_user_id
              AND last_seen_at >= p_period_start
              AND last_seen_at <  p_period_end
            ORDER BY mention_count DESC NULLS LAST
            LIMIT 5
        ) tt;

        RETURN jsonb_build_object(
            'total_mentions', v_total_mentions,
            'previous_mentions', v_prev_mentions,
            'mention_growth_pct', v_growth,
            'new_threads', v_new_threads,
            'active_threads', v_active_threads,
            'avg_sentiment', ROUND(v_avg_sentiment::numeric, 3),
            'top_platforms', v_top_platforms,
            'top_threads', v_top_threads,
            'period_start', p_period_start,
            'period_end', p_period_end
        );
    END;$$;
    """,
]


def upgrade() -> None:  # noqa: D401
    for sql in FUNCTIONS_SQL:
        op.execute(sql)


def downgrade() -> None:  # noqa: D401
    # Drop in reverse order (independent anyway)
    op.execute("DROP FUNCTION IF EXISTS get_dashboard_metrics(uuid, timestamptz, timestamptz)")
    op.execute("DROP FUNCTION IF EXISTS update_narrative_thread(uuid)")
    op.execute("DROP FUNCTION IF EXISTS get_sentiment_timeline(uuid, timestamptz, timestamptz, text, text[])")
    op.execute("DROP FUNCTION IF EXISTS calculate_influence_score(int, numeric, boolean, text)")
    op.execute("DROP FUNCTION IF EXISTS search_similar_content(uuid, vector, int, text[], text[], double precision)")
