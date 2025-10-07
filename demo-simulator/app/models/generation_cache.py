"""Generation cache model - for cost optimization."""
import uuid
import hashlib
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB

from app.core.database import Base


class GenerationCache(Base):
    """Cache for AI-generated content to reduce costs."""
    
    __tablename__ = "generation_cache"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Cache identification
    cache_key = Column(String(255), unique=True, nullable=False, index=True)
    content_type = Column(String(50), nullable=False, index=True)  # comment, dm, title, persona, etc.
    prompt_hash = Column(String(64), nullable=False, index=True)
    
    # Generated content
    generated_content = Column(JSONB, nullable=False)
    
    # Usage tracking
    use_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<GenerationCache {self.content_type} - uses: {self.use_count}>"
    
    @staticmethod
    def create_cache_key(content_type: str, prompt: str, **kwargs) -> str:
        """Create unique cache key from content type and prompt."""
        # Create deterministic key from prompt and params
        key_parts = [content_type, prompt]
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}={v}")
        
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()
    
    @staticmethod
    def create_prompt_hash(prompt: str) -> str:
        """Create hash of the prompt for indexing."""
        return hashlib.sha256(prompt.encode()).hexdigest()
    
    def increment_use(self):
        """Increment usage count."""
        self.use_count += 1
        self.last_used_at = datetime.utcnow()
