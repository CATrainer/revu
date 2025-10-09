# Credit System Integration Checklist

## Initial Setup

- [ ] **Run database migration**
  ```bash
  psql $DATABASE_URL < backend/migrations/20250109_create_credit_tracking.sql
  ```
  
- [ ] **Verify tables created**
  ```sql
  SELECT COUNT(*) FROM credit_usage_events;  -- Should work
  SELECT COUNT(*) FROM user_credit_balances;  -- Should work
  SELECT COUNT(*) FROM credit_action_costs;  -- Should have ~12 rows
  ```

- [ ] **Verify Celery is running**
  ```bash
  celery -A app.core.celery worker -Q default,credits --loglevel=info
  ```

## Phase 1: AI Operations (Highest Priority)

- [ ] **Chat endpoint** (`app/api/v1/endpoints/chat.py`)
  - [ ] Track Claude API calls in streaming chat
  - [ ] Capture input/output tokens from response
  - [ ] Call `track_ai_usage()` after streaming completes
  
- [ ] **AI comment responses** (wherever Claude generates responses)
  - [ ] Track in comment auto-reply logic
  - [ ] Include comment_id as resource_id

- [ ] **AI content suggestions** (if implemented)
  - [ ] Track when generating content ideas
  
- [ ] **Test AI tracking**
  ```sql
  -- Verify events appear
  SELECT * FROM credit_usage_events 
  WHERE action_type = 'ai_chat_message' 
  ORDER BY created_at DESC LIMIT 5;
  ```

## Phase 2: Automation & Workflows

- [ ] **Workflow executions** (Celery tasks)
  - [ ] Add `track_compute_usage()` to workflow task
  - [ ] Use `CELERY_TASK_COSTS["workflow_execution"]` for cost
  
- [ ] **Scheduled tasks**
  - [ ] Track recurring jobs
  - [ ] Use minimal cost (0.0005 credits)
  
- [ ] **Bulk operations**
  - [ ] Track batch comment processing
  - [ ] Track bulk message sends

- [ ] **Test workflow tracking**
  ```sql
  SELECT * FROM credit_usage_events 
  WHERE action_type LIKE '%workflow%' 
  ORDER BY created_at DESC;
  ```

## Phase 3: Platform Features

- [ ] **YouTube sync** (video/comment fetching)
  - [ ] Track in sync tasks
  - [ ] Include connection_id as resource_id
  
- [ ] **Comment fetch operations**
  - [ ] Track individual comment fetches
  
- [ ] **Video analysis**
  - [ ] Track video processing operations
  
- [ ] **Analytics generation**
  - [ ] Track when generating reports/dashboards

- [ ] **Test platform tracking**
  ```sql
  SELECT action_type, COUNT(*), SUM(credits_charged) 
  FROM credit_usage_events 
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY action_type;
  ```

## Phase 4: Monitoring & Validation

- [ ] **Test with real users for 1 week**
  - [ ] Monitor credit consumption rates
  - [ ] Verify costs are reasonable
  - [ ] Check for any missing tracking

- [ ] **Validate cost calculations**
  ```sql
  -- Average credits per action type
  SELECT 
      action_type,
      AVG(credits_charged) as avg_credits,
      MIN(credits_charged) as min_credits,
      MAX(credits_charged) as max_credits
  FROM credit_usage_events
  GROUP BY action_type;
  ```

- [ ] **Check for outliers**
  ```sql
  -- Find unusually expensive operations
  SELECT * FROM credit_usage_events 
  WHERE credits_charged > 1.0 
  ORDER BY credits_charged DESC;
  ```

- [ ] **Verify demo mode exclusion**
  ```sql
  -- Should be ZERO events for demo users
  SELECT COUNT(*) 
  FROM credit_usage_events ce
  JOIN users u ON u.id = ce.user_id
  WHERE u.demo_mode = true;
  ```

## Phase 5: Cost Adjustments (If Needed)

- [ ] **Review actual costs vs estimates**
  - [ ] Compare AI token costs to our charges
  - [ ] Adjust compute costs if needed
  
- [ ] **Update cost configuration**
  ```sql
  UPDATE credit_action_costs 
  SET compute_cost_dollars = 0.XXX 
  WHERE action_type = 'action_name';
  ```

- [ ] **Document any changes**
  - [ ] Update cost tables in documentation
  - [ ] Note reasons for adjustments

## Phase 6: User Visibility (Future)

- [ ] **Frontend: Credit balance display**
  - [ ] Add balance widget to dashboard
  - [ ] Show monthly allowance
  - [ ] Show next reset date

- [ ] **Frontend: Usage stats**
  - [ ] Daily usage graph
  - [ ] Breakdown by action type
  - [ ] Usage projections

- [ ] **Frontend: Low balance warnings**
  - [ ] Alert at 80% consumed
  - [ ] Alert at 90% consumed
  - [ ] Block at 100% consumed

- [ ] **Email notifications**
  - [ ] Low balance warning emails
  - [ ] Monthly usage summary
  - [ ] Approaching limit alerts

## Testing Checklist

### Unit Tests
- [ ] Test `CreditService.calculate_ai_cost()`
- [ ] Test `CreditService.track_usage()`
- [ ] Test demo mode exclusion
- [ ] Test balance updates
- [ ] Test monthly reset logic

### Integration Tests
- [ ] Test end-to-end tracking flow
- [ ] Test Celery task queuing
- [ ] Test API endpoints
- [ ] Test concurrent balance updates

### Manual Testing
- [ ] Make AI chat request → verify event created
- [ ] Run workflow → verify event created
- [ ] Check balance endpoint → verify accurate
- [ ] Test with demo mode user → verify no tracking

## Production Readiness

- [ ] **Performance validated**
  - [ ] No noticeable latency in API requests
  - [ ] Celery queue not backing up
  - [ ] Database queries optimized

- [ ] **Error handling tested**
  - [ ] Failed tracking doesn't break app
  - [ ] Missing costs handled gracefully
  - [ ] Database errors logged but don't propagate

- [ ] **Monitoring setup**
  - [ ] Alert on tracking failures
  - [ ] Dashboard for credit consumption
  - [ ] Reports on top consumers

- [ ] **Documentation complete**
  - [ ] Team trained on system
  - [ ] Integration guide updated
  - [ ] Cost model documented

## Ongoing Maintenance

### Weekly
- [ ] Review top credit consumers
- [ ] Check for tracking failures in logs
- [ ] Verify balance resets happening

### Monthly
- [ ] Generate usage report by action type
- [ ] Review cost configuration accuracy
- [ ] Plan for any needed adjustments
- [ ] Forecast credit needs for next month

### Quarterly
- [ ] Comprehensive cost analysis
- [ ] User feedback on credit system
- [ ] Consider new pricing tiers
- [ ] Optimize expensive operations

## Success Metrics

- ✅ **Tracking Coverage**: >95% of AI operations tracked
- ✅ **Performance**: <10ms added latency from tracking
- ✅ **Accuracy**: Costs within 10% of actual API charges
- ✅ **Reliability**: <0.1% tracking failure rate
- ✅ **User Experience**: No user complaints about tracking

## Notes

- Remember: Everything happens asynchronously (non-blocking)
- Demo mode is automatically excluded (no code needed)
- Start small (just AI), then expand coverage
- Monitor first week closely, then weekly spot checks
- Adjust costs based on real data, not estimates

---

**Current Status**: [ ] Not Started | [ ] In Progress | [ ] Complete
**Last Updated**: _________________
**Notes**: _________________
