// Theme initialization script - runs before React hydration
(function() {
  try {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    console.log('Theme script running, saved theme:', savedTheme);
    
    // Always start clean - remove any existing theme classes
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    
    // Force light mode styles initially
    document.documentElement.style.colorScheme = 'light';
    
    // Apply theme based on saved preference
    if (savedTheme === 'dark') {
      console.log('Applying dark mode');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    } else if (savedTheme === 'light') {
      console.log('Applying light mode');
      // Light is default, no classes needed
      document.documentElement.style.colorScheme = 'light';
    } else if (savedTheme === 'system') {
      console.log('Applying system theme');
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.style.colorScheme = 'light';
      }
    }
    
    console.log('Theme applied, document classes:', document.documentElement.className);
    
  } catch (error) {
    console.error('Theme script error:', error);
    // Fallback to light mode
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = 'light';
  }
})();
