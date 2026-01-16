# Repruv Comprehensive Test Table

## Test Info
- **Tester:** _______________
- **Date:** _______________
- **Environment:** ☐ Local | ☐ Staging | ☐ Production

**Legend:** ✅ Pass | ❌ Fail | ⏭️ Skip | 🔄 Retest

---

# SECTION 1: AUTHENTICATION

| ID | Test Case | Account | Steps | Expected | Status | Notes |
|----|-----------|---------|-------|----------|--------|-------|
| AUTH-001 | Empty form submission | Creator | Submit signup with no data | Validation errors | ☐ | |
| AUTH-002 | Empty form submission | Agency | Submit signup with no data | Validation errors | ☐ | |
| AUTH-003 | Invalid email format | Creator | Enter "notanemail" | Email error shown | ☐ | |
| AUTH-004 | Invalid email format | Agency | Enter "notanemail" | Email error shown | ☐ | |
| AUTH-005 | Password too short | Creator | Enter < 8 chars | Length error shown | ☐ | |
| AUTH-006 | Password too short | Agency | Enter < 8 chars | Length error shown | ☐ | |
| AUTH-007 | Password mismatch | Creator | Different passwords | Mismatch error | ☐ | |
| AUTH-008 | Password mismatch | Agency | Different passwords | Mismatch error | ☐ | |
| AUTH-009 | Duplicate email | Creator | Use existing email | Duplicate error | ☐ | |
| AUTH-010 | Duplicate email | Agency | Use existing email | Duplicate error | ☐ | |
| AUTH-011 | Successful registration | Creator | Valid details, submit | Account created | ☐ | |
| AUTH-012 | Successful registration | Agency | Valid details, submit | Account created | ☐ | |
| AUTH-013 | Welcome email | Creator | After registration | Email received | ☐ | |
| AUTH-014 | Welcome email | Agency | After registration | Email received | ☐ | |
| AUTH-015 | Email verification | Creator | Click verify link | Account verified | ☐ | |
| AUTH-016 | Email verification | Agency | Click verify link | Account verified | ☐ | |
| AUTH-017 | Login correct creds | Creator | Valid email/password | Login success | ☐ | |
| AUTH-018 | Login correct creds | Agency | Valid email/password | Login success | ☐ | |
| AUTH-019 | Login wrong password | Creator | Wrong password | Error shown | ☐ | |
| AUTH-020 | Login wrong password | Agency | Wrong password | Error shown | ☐ | |
| AUTH-021 | Login non-existent | Creator | Unregistered email | Error shown | ☐ | |
| AUTH-022 | Login non-existent | Agency | Unregistered email | Error shown | ☐ | |
| AUTH-023 | Session persistence | Creator | Login, refresh | Still logged in | ☐ | |
| AUTH-024 | Session persistence | Agency | Login, refresh | Still logged in | ☐ | |
| AUTH-025 | Logout | Creator | Click logout | Logged out | ☐ | |
| AUTH-026 | Logout | Agency | Click logout | Logged out | ☐ | |
| AUTH-027 | Forgot password | Creator | Click forgot link | Reset page shown | ☐ | |
| AUTH-028 | Forgot password | Agency | Click forgot link | Reset page shown | ☐ | |
| AUTH-029 | Reset email sent | Creator | Submit email | Email received | ☐ | |
| AUTH-030 | Reset email sent | Agency | Submit email | Email received | ☐ | |
| AUTH-031 | Reset link works | Creator | Click reset link | New password form | ☐ | |
| AUTH-032 | Reset link works | Agency | Click reset link | New password form | ☐ | |
| AUTH-033 | New password set | Creator | Submit new password | Password changed | ☐ | |
| AUTH-034 | New password set | Agency | Submit new password | Password changed | ☐ | |
| AUTH-035 | Login new password | Creator | Use new password | Login success | ☐ | |
| AUTH-036 | Login new password | Agency | Use new password | Login success | ☐ | |
| AUTH-037 | Old password rejected | Creator | Use old password | Error shown | ☐ | |
| AUTH-038 | Old password rejected | Agency | Use old password | Error shown | ☐ | |
| AUTH-039 | Pending state | Creator | Login unapproved | Pending page shown | ☐ | |
| AUTH-040 | Pending state | Agency | Login unapproved | Pending page shown | ☐ | |
| AUTH-041 | Blocked while pending | Creator | Access /dashboard | Redirected | ☐ | |
| AUTH-042 | Blocked while pending | Agency | Access /agency | Redirected | ☐ | |
| AUTH-043 | Access after approval | Creator | Admin approves | Dashboard access | ☐ | |
| AUTH-044 | Access after approval | Agency | Admin approves | Agency access | ☐ | |
| AUTH-045 | Onboarding shows | Creator | First login | Wizard displayed | ☐ | |
| AUTH-046 | Onboarding shows | Agency | First login | Wizard displayed | ☐ | |
| AUTH-047 | Complete onboarding | Creator | Fill all steps | Completed | ☐ | |
| AUTH-048 | Complete onboarding | Agency | Fill all steps | Completed | ☐ | |
| AUTH-049 | Skip onboarding | Creator | Click skip | Dashboard shown | ☐ | |
| AUTH-050 | Skip onboarding | Agency | Click skip | Dashboard shown | ☐ | |

---

# SECTION 2: CREATOR TIER ACCESS CONTROL

| ID | Test Case | Tier | URL/Action | Expected | Status | Notes |
|----|-----------|------|------------|----------|--------|-------|
| TIER-001 | Free status in settings | Free | /settings | Shows "Free" | ☐ | |
| TIER-002 | Access opportunities | Free | /dashboard/opportunities | Page loads | ☐ | |
| TIER-003 | Access settings | Free | /settings | Page loads | ☐ | |
| TIER-004 | BLOCKED: dashboard | Free | /dashboard | Upgrade prompt | ☐ | |
| TIER-005 | BLOCKED: ai-assistant | Free | /ai-assistant | Upgrade prompt | ☐ | |
| TIER-006 | BLOCKED: comments | Free | /comments | Upgrade prompt | ☐ | |
| TIER-007 | BLOCKED: interactions | Free | /interactions | Upgrade prompt | ☐ | |
| TIER-008 | BLOCKED: insights | Free | /insights | Upgrade prompt | ☐ | |
| TIER-009 | BLOCKED: monetization | Free | /monetization | Upgrade prompt | ☐ | |
| TIER-010 | Upgrade CTA visible | Free | Blocked page | Button shown | ☐ | |
| TIER-011 | Upgrade CTA works | Free | Click upgrade | Redirect to upgrade | ☐ | |
| TIER-012 | Pro status in settings | Pro | /settings | Shows "Pro" | ☐ | |
| TIER-013 | Access dashboard | Pro | /dashboard | Page loads | ☐ | |
| TIER-014 | Access ai-assistant | Pro | /ai-assistant | Page loads | ☐ | |
| TIER-015 | Access comments | Pro | /comments | Page loads | ☐ | |
| TIER-016 | Access interactions | Pro | /interactions | Page loads | ☐ | |
| TIER-017 | Access insights | Pro | /insights | Page loads | ☐ | |
| TIER-018 | Access monetization | Pro | /monetization | Page loads | ☐ | |
| TIER-019 | Upgrade page loads | Free | /dashboard/upgrade | Page displays | ☐ | |
| TIER-020 | Pro features listed | Free | Upgrade page | Features shown | ☐ | |
| TIER-021 | Pricing shown | Free | Upgrade page | £19.99/month | ☐ | |
| TIER-022 | Trial messaging | Free | Upgrade page | 30-day trial shown | ☐ | |
| TIER-023 | Start trial button | Free | Click button | Stripe Checkout | ☐ | |
| TIER-024 | Stripe Checkout | Free | Complete checkout | Payment processed | ☐ | |
| TIER-025 | Tier updated | Free→Pro | After checkout | tier = 'pro' | ☐ | |
| TIER-026 | Trial end date set | Pro | Check settings | 30 days from now | ☐ | |

---

# SECTION 3: CREATOR OPPORTUNITIES (FREE + PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| OPP-001 | List loads | Navigate to page | Opportunities shown | ☐ | |
| OPP-002 | Pagination | Click through pages | Pages load | ☐ | |
| OPP-003 | Search by keyword | Enter search term | Results filtered | ☐ | |
| OPP-004 | Filter by category | Select category | Results filtered | ☐ | |
| OPP-005 | Filter by compensation | Set range | Results filtered | ☐ | |
| OPP-006 | Multiple filters | Apply 2+ filters | Correct results | ☐ | |
| OPP-007 | Clear filters | Click clear | All results shown | ☐ | |
| OPP-008 | View details | Click opportunity | Detail page loads | ☐ | |
| OPP-009 | Details complete | View detail | All info shown | ☐ | |
| OPP-010 | Apply button | View detail | Button visible | ☐ | |
| OPP-011 | Application form | Click apply | Form displayed | ☐ | |
| OPP-012 | Submit application | Fill and submit | Submitted | ☐ | |
| OPP-013 | Confirmation | After submit | Success message | ☐ | |
| OPP-014 | Application history | Check history | Application listed | ☐ | |
| OPP-015 | Invitations page | Navigate | Page loads | ☐ | |
| OPP-016 | Accept invitation | Click accept | Accepted | ☐ | |
| OPP-017 | Decline invitation | Click decline | Declined | ☐ | |

---

# SECTION 4: CREATOR SETTINGS (FREE + PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| SET-001 | Page loads | Navigate to /settings | Page displayed | ☐ | |
| SET-002 | Update name | Change, save | Name updated | ☐ | |
| SET-003 | Update bio | Change, save | Bio updated | ☐ | |
| SET-004 | Update picture | Upload image | Picture updated | ☐ | |
| SET-005 | Change password | New password, save | Password changed | ☐ | |
| SET-006 | Email notifications | Toggle off | Setting saved | ☐ | |
| SET-007 | Push notifications | Toggle off | Setting saved | ☐ | |
| SET-008 | Privacy settings | Change visibility | Setting saved | ☐ | |
| SET-009 | Billing (Free) | View tab | Shows "Free" | ☐ | |
| SET-010 | Billing (Pro) | View tab | Shows "Pro" | ☐ | |
| SET-011 | Upgrade button | Free billing | Button visible | ☐ | |
| SET-012 | Manage subscription | Pro billing | Stripe Portal | ☐ | |
| SET-013 | Settings persist | Save, refresh | Settings retained | ☐ | |

---

# SECTION 5: CREATOR DASHBOARD (PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| DASH-001 | Page loads | Navigate to /dashboard | Page displayed | ☐ | |
| DASH-002 | Metrics show | View page | Metrics displayed | ☐ | |
| DASH-003 | Recent activity | View page | Activity shown | ☐ | |
| DASH-004 | Quick actions | Click buttons | Actions work | ☐ | |
| DASH-005 | Notifications | View widget | Notifications shown | ☐ | |
| DASH-006 | Refresh | Reload page | Data updates | ☐ | |

---

# SECTION 6: AI CREATOR ASSISTANT (PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| AI-001 | Page loads | Navigate to /ai-assistant | Chat interface | ☐ | |
| AI-002 | Send message | Type and send | Message appears | ☐ | |
| AI-003 | AI responds | Send message | Response received | ☐ | |
| AI-004 | Relevant response | Ask question | Relevant answer | ☐ | |
| AI-005 | Suggested prompts | Click prompt | Response received | ☐ | |
| AI-006 | Multi-turn chat | Multiple messages | Context maintained | ☐ | |
| AI-007 | Content ideas | Ask for ideas | Ideas provided | ☐ | |
| AI-008 | Strategy advice | Ask for strategy | Advice provided | ☐ | |
| AI-009 | History persists | Leave and return | History preserved | ☐ | |
| AI-010 | New conversation | Start new | Fresh chat | ☐ | |

---

# SECTION 7: COMMENTS MANAGEMENT (PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| COM-001 | Page loads | Navigate to /comments | Page displayed | ☐ | |
| COM-002 | Comments list | View page | Comments shown | ☐ | |
| COM-003 | Filter platform | Select YouTube/IG | Filtered | ☐ | |
| COM-004 | Filter sentiment | Select pos/neg/neu | Filtered | ☐ | |
| COM-005 | Search | Enter term | Filtered | ☐ | |
| COM-006 | Pagination | Navigate pages | Pages load | ☐ | |
| COM-007 | View detail | Click comment | Detail shown | ☐ | |
| COM-008 | Comment info | View detail | All info shown | ☐ | |
| COM-009 | Sentiment shown | View detail | Indicator shown | ☐ | |
| COM-010 | Manual reply | Type, submit | Reply posted | ☐ | |
| COM-011 | AI reply | Click generate | Suggestion shown | ☐ | |
| COM-012 | Edit AI reply | Modify text | Changes saved | ☐ | |
| COM-013 | Approve AI reply | Click approve | Reply posted | ☐ | |
| COM-014 | Regenerate | Click regenerate | New suggestion | ☐ | |
| COM-015 | Workflows page | Navigate | Page loads | ☐ | |
| COM-016 | Create workflow | Fill, save | Created | ☐ | |
| COM-017 | Enable workflow | Toggle on | Enabled | ☐ | |
| COM-018 | Disable workflow | Toggle off | Disabled | ☐ | |
| COM-019 | Edit workflow | Modify, save | Updated | ☐ | |
| COM-020 | Delete workflow | Click delete | Removed | ☐ | |
| COM-021 | DMs page | Navigate | Page loads | ☐ | |
| COM-022 | View DM | Click DM | Conversation shown | ☐ | |
| COM-023 | Reply to DM | Send reply | Reply sent | ☐ | |
| COM-024 | Mentions page | Navigate | Page loads | ☐ | |
| COM-025 | View mention | Click mention | Details shown | ☐ | |

---

# SECTION 8: INTERACTIONS (PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| INT-001 | Page loads | Navigate to /interactions | Page displayed | ☐ | |
| INT-002 | Feed shows | View page | Feed displayed | ☐ | |
| INT-003 | Filter by type | Select type | Filtered | ☐ | |
| INT-004 | Filter by date | Set range | Filtered | ☐ | |
| INT-005 | Filter by platform | Select platform | Filtered | ☐ | |
| INT-006 | Analytics | View analytics | Displayed | ☐ | |
| INT-007 | Respond | Click respond | Interface shown | ☐ | |

---

# SECTION 9: INSIGHTS (PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| INS-001 | Page loads | Navigate to /insights | Page displayed | ☐ | |
| INS-002 | Metrics show | View page | Metrics displayed | ☐ | |
| INS-003 | Views metric | View page | Count shown | ☐ | |
| INS-004 | Engagement rate | View page | Percentage shown | ☐ | |
| INS-005 | Follower growth | View page | Growth shown | ☐ | |
| INS-006 | Top content | View page | Content listed | ☐ | |
| INS-007 | Date filter | Select range | Data updates | ☐ | |
| INS-008 | Platform filter | Select platform | Data updates | ☐ | |
| INS-009 | Charts render | View page | Charts shown | ☐ | |
| INS-010 | What's Working | Navigate | Page loads | ☐ | |
| INS-011 | Top content | View page | Content shown | ☐ | |
| INS-012 | Recommendations | View page | Shown | ☐ | |
| INS-013 | What's Not Working | Navigate | Page loads | ☐ | |
| INS-014 | Underperforming | View page | Content shown | ☐ | |
| INS-015 | Suggestions | View page | Shown | ☐ | |

---

# SECTION 10: MONETIZATION (PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| MON-001 | Page loads | Navigate to /monetization | Page displayed | ☐ | |
| MON-002 | Earnings overview | View page | Displayed | ☐ | |
| MON-003 | Revenue breakdown | View page | Displayed | ☐ | |
| MON-004 | Date filter | Select range | Data updates | ☐ | |
| MON-005 | Create project | Fill, save | Created | ☐ | |
| MON-006 | Project in list | After create | Listed | ☐ | |
| MON-007 | View project | Click project | Details shown | ☐ | |
| MON-008 | Edit project | Modify, save | Updated | ☐ | |
| MON-009 | Delete project | Click delete | Removed | ☐ | |

---

# SECTION 11: PLATFORM INTEGRATIONS (PRO)

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| PLAT-001 | Enable demo mode | Toggle on | Demo data shown | ☐ | |
| PLAT-002 | Demo indicator | View app | Indicator shown | ☐ | |
| PLAT-003 | Disable demo mode | Toggle off | Demo data removed | ☐ | |
| PLAT-004 | Connect YouTube | Click connect | OAuth flow | ☐ | |
| PLAT-005 | YouTube OAuth | Complete flow | Connected | ☐ | |
| PLAT-006 | YouTube data sync | After connect | Data syncs | ☐ | |
| PLAT-007 | Disconnect YouTube | Click disconnect | Disconnected | ☐ | |
| PLAT-008 | Connect Instagram | Click connect | OAuth flow | ☐ | |
| PLAT-009 | Instagram OAuth | Complete flow | Connected | ☐ | |
| PLAT-010 | Disconnect Instagram | Click disconnect | Disconnected | ☐ | |

---

# SECTION 12: AGENCY DASHBOARD

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| AG-001 | Dashboard loads | Navigate to /agency | Page displayed | ☐ | |
| AG-002 | Overview metrics | View page | Metrics shown | ☐ | |
| AG-003 | Creator summary | View page | Summary shown | ☐ | |
| AG-004 | Campaign summary | View page | Summary shown | ☐ | |
| AG-005 | Revenue summary | View page | Summary shown | ☐ | |
| AG-006 | Quick actions | Click buttons | Actions work | ☐ | |
| AG-007 | Recent activity | View page | Activity shown | ☐ | |

---

# SECTION 13: AGENCY CREATOR MANAGEMENT

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| ACR-001 | Creators page | Navigate | Page loads | ☐ | |
| ACR-002 | Creator list | View page | List shown | ☐ | |
| ACR-003 | Search creators | Enter term | Filtered | ☐ | |
| ACR-004 | Filter creators | Select filter | Filtered | ☐ | |
| ACR-005 | Sort creators | Select sort | Sorted | ☐ | |
| ACR-006 | Add creator | Click add | Form shown | ☐ | |
| ACR-007 | Send invitation | Fill, submit | Email sent | ☐ | |
| ACR-008 | Creator detail | Click creator | Detail shown | ☐ | |
| ACR-009 | Creator analytics | View detail | Analytics shown | ☐ | |
| ACR-010 | Edit creator | Modify, save | Updated | ☐ | |
| ACR-011 | Remove creator | Click remove | Removed | ☐ | |
| ACR-012 | Groups page | Navigate | Page loads | ☐ | |
| ACR-013 | Create group | Fill, save | Created | ☐ | |
| ACR-014 | Add to group | Select creator | Added | ☐ | |
| ACR-015 | Remove from group | Click remove | Removed | ☐ | |
| ACR-016 | Delete group | Click delete | Deleted | ☐ | |
| ACR-017 | Performance page | Navigate | Page loads | ☐ | |
| ACR-018 | Performance metrics | View page | Metrics shown | ☐ | |
| ACR-019 | Performance charts | View page | Charts render | ☐ | |

---

# SECTION 14: AGENCY CAMPAIGNS

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| ACP-001 | Campaigns page | Navigate | Page loads | ☐ | |
| ACP-002 | Campaign list | View page | List shown | ☐ | |
| ACP-003 | Search campaigns | Enter term | Filtered | ☐ | |
| ACP-004 | Filter by status | Select status | Filtered | ☐ | |
| ACP-005 | Create campaign | Click new | Form shown | ☐ | |
| ACP-006 | Fill details | Enter info | Saved | ☐ | |
| ACP-007 | Assign creators | Select creators | Assigned | ☐ | |
| ACP-008 | Campaign detail | Click campaign | Detail shown | ☐ | |
| ACP-009 | Edit campaign | Modify, save | Updated | ☐ | |
| ACP-010 | Update status | Change status | Updated | ☐ | |
| ACP-011 | Delete campaign | Click delete | Deleted | ☐ | |
| ACP-012 | Templates page | Navigate | Page loads | ☐ | |
| ACP-013 | Create template | Fill, save | Created | ☐ | |
| ACP-014 | Use template | Select template | Campaign created | ☐ | |
| ACP-015 | Timeline page | Navigate | Page loads | ☐ | |
| ACP-016 | Timeline view | View page | Timeline shown | ☐ | |

---

# SECTION 15: AGENCY FINANCE

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| AFI-001 | Finance page | Navigate | Page loads | ☐ | |
| AFI-002 | Revenue metrics | View page | Shown | ☐ | |
| AFI-003 | Expense metrics | View page | Shown | ☐ | |
| AFI-004 | Profit/loss | View page | Shown | ☐ | |
| AFI-005 | Date filter | Select range | Data updates | ☐ | |
| AFI-006 | Charts render | View page | Charts shown | ☐ | |
| AFI-007 | Invoices page | Navigate | Page loads | ☐ | |
| AFI-008 | Invoice list | View page | List shown | ☐ | |
| AFI-009 | Create invoice | Fill, save | Created | ☐ | |
| AFI-010 | View invoice | Click invoice | Detail shown | ☐ | |
| AFI-011 | Edit invoice | Modify, save | Updated | ☐ | |
| AFI-012 | Mark paid | Click paid | Status updated | ☐ | |
| AFI-013 | Send invoice | Click send | Sent | ☐ | |
| AFI-014 | Download PDF | Click download | PDF downloaded | ☐ | |
| AFI-015 | Payouts page | Navigate | Page loads | ☐ | |
| AFI-016 | Payout list | View page | List shown | ☐ | |
| AFI-017 | Create payout | Fill, save | Created | ☐ | |
| AFI-018 | Process payout | Click process | Processed | ☐ | |

---

# SECTION 16: AGENCY OPPORTUNITIES

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| AOP-001 | Opportunities page | Navigate | Page loads | ☐ | |
| AOP-002 | Opportunity list | View page | List shown | ☐ | |
| AOP-003 | Create opportunity | Fill, save | Created | ☐ | |
| AOP-004 | View detail | Click opportunity | Detail shown | ☐ | |
| AOP-005 | Review applications | View applications | List shown | ☐ | |
| AOP-006 | Accept application | Click accept | Accepted | ☐ | |
| AOP-007 | Reject application | Click reject | Rejected | ☐ | |
| AOP-008 | Edit opportunity | Modify, save | Updated | ☐ | |
| AOP-009 | Close opportunity | Click close | Closed | ☐ | |

---

# SECTION 17: AGENCY PIPELINE, TEAM, TASKS

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| APT-001 | Pipeline page | Navigate | Page loads | ☐ | |
| APT-002 | Stages display | View page | Stages shown | ☐ | |
| APT-003 | Add deal | Fill, save | Added | ☐ | |
| APT-004 | Move deal | Drag to stage | Moved | ☐ | |
| APT-005 | Edit deal | Modify, save | Updated | ☐ | |
| APT-006 | Delete deal | Click delete | Deleted | ☐ | |
| APT-007 | Team page | Navigate | Page loads | ☐ | |
| APT-008 | Team list | View page | List shown | ☐ | |
| APT-009 | Invite member | Fill, send | Invitation sent | ☐ | |
| APT-010 | Set role | Select role | Role set | ☐ | |
| APT-011 | Edit permissions | Modify, save | Updated | ☐ | |
| APT-012 | Remove member | Click remove | Removed | ☐ | |
| APT-013 | Tasks page | Navigate | Page loads | ☐ | |
| APT-014 | Task list | View page | List shown | ☐ | |
| APT-015 | Create task | Fill, save | Created | ☐ | |
| APT-016 | Assign task | Select assignee | Assigned | ☐ | |
| APT-017 | Set due date | Select date | Set | ☐ | |
| APT-018 | Mark complete | Click complete | Completed | ☐ | |
| APT-019 | Delete task | Click delete | Deleted | ☐ | |

---

# SECTION 18: AGENCY SETTINGS

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| AST-001 | Settings page | Navigate | Page loads | ☐ | |
| AST-002 | Update name | Change, save | Updated | ☐ | |
| AST-003 | Update logo | Upload image | Updated | ☐ | |
| AST-004 | Update contact | Change, save | Updated | ☐ | |
| AST-005 | Billing page | Navigate | Page loads | ☐ | |
| AST-006 | Subscription status | View page | Status shown | ☐ | |
| AST-007 | Update payment | Click update | Portal opens | ☐ | |
| AST-008 | View invoices | Click invoices | List shown | ☐ | |
| AST-009 | Integrations page | Navigate | Page loads | ☐ | |
| AST-010 | Connect integration | Click connect | Connected | ☐ | |
| AST-011 | Disconnect | Click disconnect | Disconnected | ☐ | |

---

# SECTION 19: BILLING & STRIPE

| ID | Test Case | Account | Steps | Expected | Status | Notes |
|----|-----------|---------|-------|----------|--------|-------|
| BIL-001 | Stripe Portal | Creator Pro | Click manage | Portal opens | ☐ | |
| BIL-002 | Update payment | Creator Pro | Change card | Updated | ☐ | |
| BIL-003 | View invoices | Creator Pro | Click invoices | List shown | ☐ | |
| BIL-004 | Cancel subscription | Creator Pro | Click cancel | Cancelled | ☐ | |
| BIL-005 | Webhook: checkout | Creator | Complete checkout | Tier = pro | ☐ | |
| BIL-006 | Webhook: updated | Creator | Subscription change | Status updates | ☐ | |
| BIL-007 | Webhook: deleted | Creator | Cancel subscription | Tier = free | ☐ | |
| BIL-008 | Webhook: invoice.paid | Creator | Payment success | Recorded | ☐ | |
| BIL-009 | Webhook: payment_failed | Creator | Payment fails | Handled | ☐ | |
| BIL-010 | Agency billing | Agency | View billing | Status shown | ☐ | |

---

# SECTION 20: RESPONSIVE DESIGN

| ID | Test Case | Viewport | Pages | Expected | Status | Notes |
|----|-----------|----------|-------|----------|--------|-------|
| RES-001 | Desktop layout | 1920x1080 | Creator dashboard | Correct layout | ☐ | |
| RES-002 | Desktop layout | 1920x1080 | Agency dashboard | Correct layout | ☐ | |
| RES-003 | Desktop navigation | 1920x1080 | All | Navigation works | ☐ | |
| RES-004 | Tablet layout | 768x1024 | Creator dashboard | Adapts | ☐ | |
| RES-005 | Tablet layout | 768x1024 | Agency dashboard | Adapts | ☐ | |
| RES-006 | Tablet navigation | 768x1024 | All | Collapses | ☐ | |
| RES-007 | Mobile layout | 375x667 | Creator dashboard | Adapts | ☐ | |
| RES-008 | Mobile layout | 375x667 | Agency dashboard | Adapts | ☐ | |
| RES-009 | Mobile navigation | 375x667 | All | Works | ☐ | |
| RES-010 | Mobile forms | 375x667 | All forms | Usable | ☐ | |

---

# SECTION 21: SECURITY & ACCESS CONTROL

| ID | Test Case | Steps | Expected | Status | Notes |
|----|-----------|-------|----------|--------|-------|
| SEC-001 | Creator → Agency routes | Access /agency as creator | Blocked/redirected | ☐ | |
| SEC-002 | Agency → Creator routes | Access /dashboard as agency | Blocked/redirected | ☐ | |
| SEC-003 | Free → Pro features | Access Pro page as Free | Upgrade prompt | ☐ | |
| SEC-004 | Other user's data | Try to access | Blocked | ☐ | |
| SEC-005 | Expired JWT | Use expired token | Logged out | ☐ | |
| SEC-006 | 404 page | Non-existent URL | 404 displayed | ☐ | |
| SEC-007 | 500 handling | Trigger error | Graceful error | ☐ | |
| SEC-008 | Network error | Disconnect | Error message | ☐ | |
| SEC-009 | Form validation | Invalid data | Errors shown | ☐ | |

---

# SECTION 22: PUBLIC PAGES

| ID | Test Case | URL | Expected | Status | Notes |
|----|-----------|-----|----------|--------|-------|
| PUB-001 | Homepage | / | Page loads | ☐ | |
| PUB-002 | Pricing page | /pricing | Page loads | ☐ | |
| PUB-003 | Free tier card | /pricing | Displayed | ☐ | |
| PUB-004 | Pro tier card | /pricing | Displayed | ☐ | |
| PUB-005 | Founder tier card | /pricing | Displayed | ☐ | |
| PUB-006 | CTA buttons visible | /pricing | Visible, clickable | ☐ | |
| PUB-007 | Feature comparison | /pricing | Table displayed | ☐ | |
| PUB-008 | FAQ section | /pricing | Expandable | ☐ | |
| PUB-009 | Agency Partners | /agency-partners | Page loads | ☐ | |
| PUB-010 | Terms of Service | /terms | Page loads | ☐ | |
| PUB-011 | Privacy Policy | /privacy | Page loads | ☐ | |

---

# TEST SUMMARY

| Section | Total | Pass | Fail | Skip |
|---------|-------|------|------|------|
| 1. Authentication | 50 | | | |
| 2. Tier Access Control | 26 | | | |
| 3. Opportunities | 17 | | | |
| 4. Settings | 13 | | | |
| 5. Dashboard | 6 | | | |
| 6. AI Assistant | 10 | | | |
| 7. Comments | 25 | | | |
| 8. Interactions | 7 | | | |
| 9. Insights | 15 | | | |
| 10. Monetization | 9 | | | |
| 11. Platform Integrations | 10 | | | |
| 12. Agency Dashboard | 7 | | | |
| 13. Agency Creators | 19 | | | |
| 14. Agency Campaigns | 16 | | | |
| 15. Agency Finance | 18 | | | |
| 16. Agency Opportunities | 9 | | | |
| 17. Agency Pipeline/Team/Tasks | 19 | | | |
| 18. Agency Settings | 11 | | | |
| 19. Billing & Stripe | 10 | | | |
| 20. Responsive Design | 10 | | | |
| 21. Security | 9 | | | |
| 22. Public Pages | 11 | | | |
| **TOTAL** | **317** | | | |

---

# STRIPE TEST CARDS

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0000 0000 3220 | 3D Secure |

---

# NOTES

| ID | Issue Description | Severity | Assigned |
|----|-------------------|----------|----------|
| | | | |
| | | | |
| | | | |
