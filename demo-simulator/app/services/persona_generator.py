"""Generate realistic author personas for comments/DMs."""
import random
import string
from typing import Dict


class PersonaGenerator:
    """Generate realistic author personas."""
    
    # Common username patterns
    USERNAME_PATTERNS = [
        "{adjective}{noun}{number}",
        "{noun}{number}",
        "{adjective}{adjective}{noun}",
        "{noun}{verb}er",
        "the{adjective}{noun}",
        "{noun}_{number}",
    ]
    
    ADJECTIVES = [
        'cool', 'super', 'mega', 'ultra', 'real', 'true', 'pro', 'epic',
        'awesome', 'crazy', 'wild', 'random', 'tech', 'digital', 'cyber',
        'gamer', 'happy', 'chill', 'savage', 'legendary', 'mystery'
    ]
    
    NOUNS = [
        'gamer', 'player', 'user', 'fan', 'creator', 'maker', 'builder',
        'watcher', 'viewer', 'ninja', 'master', 'legend', 'king', 'queen',
        'boss', 'chief', 'guru', 'pro', 'expert', 'geek', 'nerd'
    ]
    
    VERBS = [
        'game', 'play', 'watch', 'make', 'build', 'code', 'stream',
        'create', 'design', 'edit', 'vlog', 'blog'
    ]
    
    # Real-sounding first names
    FIRST_NAMES = [
        'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery',
        'Sam', 'Chris', 'Jamie', 'Quinn', 'Blake', 'Dakota', 'Ryan',
        'Emma', 'Olivia', 'Noah', 'Liam', 'Sophia', 'Jackson', 'Lucas',
        'Mia', 'Ethan', 'Mason', 'Isabella', 'Aiden', 'Lily', 'Ella'
    ]
    
    LAST_NAMES = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
        'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor',
        'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White'
    ]
    
    @staticmethod
    def generate_username() -> str:
        """Generate realistic username."""
        pattern = random.choice(PersonaGenerator.USERNAME_PATTERNS)
        
        replacements = {
            'adjective': random.choice(PersonaGenerator.ADJECTIVES),
            'noun': random.choice(PersonaGenerator.NOUNS),
            'verb': random.choice(PersonaGenerator.VERBS),
            'number': str(random.randint(1, 9999)),
        }
        
        username = pattern.format(**replacements)
        
        # Sometimes capitalize
        if random.random() < 0.3:
            username = username.title()
        
        return username
    
    @staticmethod
    def generate_display_name() -> str:
        """Generate realistic display name."""
        style = random.choice(['real_name', 'username', 'creative'])
        
        if style == 'real_name':
            first = random.choice(PersonaGenerator.FIRST_NAMES)
            if random.random() < 0.5:
                # Full name
                last = random.choice(PersonaGenerator.LAST_NAMES)
                return f"{first} {last}"
            else:
                # First name only
                return first
        
        elif style == 'username':
            return PersonaGenerator.generate_username()
        
        else:
            # Creative nickname
            prefix = random.choice(['', 'The ', 'Mr ', 'Ms ', 'Dr ', ''])
            adj = random.choice(PersonaGenerator.ADJECTIVES).title()
            noun = random.choice(PersonaGenerator.NOUNS).title()
            return f"{prefix}{adj}{noun}".strip()
    
    @staticmethod
    def generate_subscriber_count() -> int:
        """Generate realistic subscriber count for commenter."""
        # Most commenters are small accounts
        distribution = random.random()
        
        if distribution < 0.6:
            # 60% have < 100 subs
            return random.randint(0, 100)
        elif distribution < 0.85:
            # 25% have 100-1000
            return random.randint(100, 1000)
        elif distribution < 0.95:
            # 10% have 1K-10K
            return random.randint(1000, 10000)
        else:
            # 5% have 10K+
            return random.randint(10000, 500000)
    
    @staticmethod
    def is_verified() -> bool:
        """Determine if author is verified (rare)."""
        # Only 1% of commenters are verified
        return random.random() < 0.01
    
    @staticmethod
    def generate_persona(niche: Optional[str] = None) -> Dict:
        """Generate complete author persona."""
        username = PersonaGenerator.generate_username()
        display_name = PersonaGenerator.generate_display_name()
        subscriber_count = PersonaGenerator.generate_subscriber_count()
        verified = PersonaGenerator.is_verified()
        
        # Generate avatar URL (placeholder - could integrate with avatar API)
        avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}"
        
        return {
            'username': username,
            'display_name': display_name,
            'avatar_url': avatar_url,
            'verified': verified,
            'subscriber_count': subscriber_count,
        }
