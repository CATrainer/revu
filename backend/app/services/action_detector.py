"""Action detection service for parsing user decisions and AI suggestions."""

import re
from typing import List, Dict, Optional, Any


class ActionDetector:
    """Detects structured actions from conversation messages."""
    
    # Decision detection patterns
    PRICING_PATTERNS = [
        r'\$(\d+)(?:/month|/mo|per month)',
        r'(\d+) dollars? per month',
    ]
    
    PLATFORM_KEYWORDS = {
        'discord': ['discord'],
        'circle': ['circle'],
        'mighty_networks': ['mighty networks', 'mighty'],
    }
    
    COMMITMENT_PHRASES = [
        'going with', "i'll do", "let's do", 'decided on',
        'choosing', "i'll charge", 'sounds good', 'that works',
        'perfect', "i'm in", 'done', "let's go with", 'yes', 'yeah'
    ]
    
    def detect_actions(
        self,
        user_message: str,
        ai_response: str,
        project_state: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect all actions from a conversation turn.
        
        Args:
            user_message: What the user said
            ai_response: What the AI responded
            project_state: Current project decisions and tasks
        
        Returns:
            List of detected actions with type, data, and confidence
        """
        
        actions = []
        
        # Check for decisions in user message
        decision = self._detect_decision(user_message, project_state)
        if decision:
            actions.append({
                "type": "decision_made",
                "data": decision,
                "confidence": decision['confidence']
            })
        
        # Check if AI marked a task complete
        task_completion = self._detect_task_completion(ai_response)
        if task_completion:
            actions.append({
                "type": "task_completed",
                "data": task_completion,
                "confidence": "high"
            })
        
        # Check for next step suggestions
        next_step = self._extract_next_step(ai_response)
        if next_step:
            actions.append({
                "type": "next_step_suggested",
                "data": next_step,
                "confidence": "medium"
            })
        
        return actions
    
    def _detect_decision(
        self,
        user_message: str,
        project_state: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Detect if user made a decision."""
        
        msg_lower = user_message.lower()
        
        # Check if message contains commitment language
        has_commitment = any(phrase in msg_lower for phrase in self.COMMITMENT_PHRASES)
        
        if not has_commitment and len(user_message.split()) < 3:
            # Short messages without commitment phrases unlikely to be decisions
            return None
        
        # Check for pricing decision
        pricing = self._extract_pricing(user_message)
        if pricing:
            confidence = 'high' if any(phrase in msg_lower for phrase in ['charge', "i'll do", 'sounds good']) else 'medium'
            return {
                'category': 'pricing',
                'value': f"${pricing}/month",
                'confidence': confidence,
                'rationale': self._extract_rationale(user_message, msg_lower)
            }
        
        # Check for platform decision
        platform = self._extract_platform(user_message)
        if platform:
            return {
                'category': 'platform',
                'value': platform,
                'confidence': 'high',
                'rationale': self._extract_rationale(user_message, msg_lower)
            }
        
        # Check for tier structure decision
        if any(word in msg_lower for word in ['single tier', 'one tier', 'just one', 'multiple tiers', 'three tiers']):
            if 'single' in msg_lower or 'one' in msg_lower or 'just' in msg_lower:
                value = 'single_tier'
                confidence = 'high'
            else:
                tier_match = re.search(r'(\d+)\s*tiers?', msg_lower)
                value = f"{tier_match.group(1)}_tiers" if tier_match else 'multiple_tiers'
                confidence = 'medium' if not tier_match else 'high'
            
            return {
                'category': 'structure',
                'value': value,
                'confidence': confidence,
                'rationale': self._extract_rationale(user_message, msg_lower)
            }
        
        # Check for timeline decision
        date_match = re.search(
            r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d+)',
            msg_lower
        )
        if date_match or any(phrase in msg_lower for phrase in ['in \d+ weeks', 'in \d+ days', 'by ']):
            return {
                'category': 'timeline',
                'value': self._extract_date(user_message),
                'confidence': 'medium',
                'rationale': self._extract_rationale(user_message, msg_lower)
            }
        
        # Check for content decision (value proposition)
        if any(phrase in msg_lower for phrase in ['weekly', 'daily', 'exclusive', 'access to', 'members get']):
            if has_commitment:
                return {
                    'category': 'content',
                    'value': user_message[:200],  # Store the value prop
                    'confidence': 'medium',
                    'rationale': 'User described member benefits'
                }
        
        return None
    
    def _extract_pricing(self, text: str) -> Optional[int]:
        """Extract price amount from text."""
        for pattern in self.PRICING_PATTERNS:
            match = re.search(pattern, text.lower())
            if match:
                return int(match.group(1))
        return None
    
    def _extract_platform(self, text: str) -> Optional[str]:
        """Extract platform choice from text."""
        text_lower = text.lower()
        for platform, keywords in self.PLATFORM_KEYWORDS.items():
            if any(keyword in text_lower for keyword in keywords):
                return platform
        return None
    
    def _extract_date(self, text: str) -> str:
        """Extract timeline from text."""
        date_match = re.search(
            r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d+)',
            text.lower()
        )
        if date_match:
            return f"{date_match.group(1).capitalize()} {date_match.group(2)}"
        
        weeks_match = re.search(r'in (\d+) weeks?', text.lower())
        if weeks_match:
            return f"in_{weeks_match.group(1)}_weeks"
        
        return "undetermined"
    
    def _extract_rationale(self, original_text: str, lower_text: str) -> str:
        """Extract reasoning if provided."""
        for keyword in ['because', 'since', 'as', 'so']:
            if keyword in lower_text:
                parts = original_text.split(keyword, 1)
                if len(parts) > 1:
                    return parts[1].strip()[:200]
        return ""
    
    def _detect_task_completion(self, ai_response: str) -> Optional[Dict[str, str]]:
        """Check if AI marked a task complete."""
        patterns = [
            r'task\s+(\d+)\.(\d+)\s+(?:done|complete)',
            r'marking\s+task\s+(\d+)\.(\d+)',
            r'✓\s+task\s+(\d+)\.(\d+)',
        ]
        
        text_lower = ai_response.lower()
        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                return {
                    'task_id': f"{match.group(1)}.{match.group(2)}",
                    'completed_via': 'ai_auto'
                }
        
        return None
    
    def _extract_next_step(self, ai_response: str) -> Optional[Dict[str, str]]:
        """Extract suggested next step."""
        next_patterns = [
            r'next[:\s]+([^.?!]+)',
            r'ready to\s+([^.?!]+)',
            r"let's\s+([^.?!]+)"
        ]
        
        for pattern in next_patterns:
            match = re.search(pattern, ai_response.lower())
            if match:
                suggestion = match.group(1).strip()
                return {
                    'suggestion': suggestion[:200],
                    'task_reference': self._find_task_reference(suggestion)
                }
        
        return None
    
    def _find_task_reference(self, text: str) -> Optional[str]:
        """Try to match suggestion to a task ID."""
        match = re.search(r'task\s+(\d+)\.(\d+)', text.lower())
        if match:
            return f"{match.group(1)}.{match.group(2)}"
        return None


# Singleton instance
_action_detector: Optional[ActionDetector] = None

def get_action_detector() -> ActionDetector:
    """Get or create action detector singleton."""
    global _action_detector
    if _action_detector is None:
        _action_detector = ActionDetector()
    return _action_detector
