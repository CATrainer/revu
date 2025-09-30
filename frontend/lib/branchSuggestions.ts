/**
 * Generate smart branch suggestions based on AI response content
 */
export function generateBranchSuggestions(message: string, context?: string): string[] {
  const suggestions: string[] = [];
  
  // Detect numbered lists or bullet points - each could be a branch
  const listItems = message.match(/(?:^|\n)\s*(?:\d+\.|[-•])\s*(.+?)(?=\n|$)/g);
  if (listItems && listItems.length >= 2) {
    listItems.slice(0, 4).forEach(item => {
      const cleaned = item.replace(/^\s*(?:\d+\.|[-•])\s*/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 100) {
        suggestions.push(`Explore: ${cleaned}`);
      }
    });
  }
  
  // Detect questions in the response - these are natural branch points
  const questions = message.match(/[^.!?]*\?/g);
  if (questions && questions.length > 0) {
    questions.slice(0, 2).forEach(q => {
      const cleaned = q.trim();
      if (cleaned.length > 10) {
        suggestions.push(cleaned);
      }
    });
  }
  
  // Detect "alternatively" or "another approach" patterns
  if (message.toLowerCase().includes('alternative')) {
    suggestions.push('Compare different approaches');
  }
  if (message.toLowerCase().includes('another') || message.toLowerCase().includes('also')) {
    suggestions.push('Explore other options');
  }
  
  // Content-specific suggestions based on keywords
  const keywords = {
    'thumbnail': ['Dive deeper into thumbnail design', 'Analyze thumbnail psychology'],
    'strategy': ['Create detailed action plan', 'Explore specific tactics'],
    'audience': ['Deep-dive audience analysis', 'Build audience personas'],
    'content': ['Brainstorm specific content ideas', 'Plan content calendar'],
    'growth': ['Explore growth strategies', 'Analyze growth metrics'],
    'engagement': ['Improve engagement tactics', 'Analyze engagement patterns'],
    'algorithm': ['Understand algorithm mechanics', 'Optimize for algorithm'],
    'analytics': ['Deep-dive analytics', 'Create tracking system'],
  };
  
  const lowerMessage = message.toLowerCase();
  Object.entries(keywords).forEach(([keyword, branchSuggestions]) => {
    if (lowerMessage.includes(keyword)) {
      suggestions.push(...branchSuggestions.slice(0, 1));
    }
  });
  
  // Generic fallback suggestions
  const genericSuggestions = [
    'Go deeper on this topic',
    'Explore practical examples',
    'Break this down step-by-step',
    'See case studies',
  ];
  
  // If we don't have enough suggestions, add generics
  while (suggestions.length < 4 && genericSuggestions.length > 0) {
    suggestions.push(genericSuggestions.shift()!);
  }
  
  // Remove duplicates and limit to 4
  return [...new Set(suggestions)].slice(0, 4);
}
