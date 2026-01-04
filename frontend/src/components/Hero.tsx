import { Waves } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative py-12 overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-hero)' }}
      />
      
      {/* Waveform decoration */}
      <div className="absolute inset-x-0 bottom-0 h-px glow-line" />
      
      <div className="container mx-auto px-4 text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Waves className="w-4 h-4 text-primary" />
          <span className="font-display text-sm text-primary">Filter the noise, find the signal</span>
        </div>
        
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 tracking-tight">
          <span className="text-gradient">Control</span> your news feed
        </h2>
        
        <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
          Aggregate stories from Reddit, Hacker News, BBC, and more. 
          Filter by sentiment and category, hide what you've read.
        </p>
      </div>
    </section>
  );
}
